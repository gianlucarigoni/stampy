/**
 * POST /api/auth/google
 *
 * Non chiama Google: la verifica del token (GoogleTokenService.verify) è simulata con vi.spyOn
 * e restituisce i claim scelti dal test. Il DB è quello vero (del worktree): utenti, identità,
 * sessioni ed eventi con email `google-<RUN>-*` e li elimina in afterAll.
 */
import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import googleTokenSrv from "../../src/api/auth/google/google-token.service";
import { InvalidGoogleTokenError } from "../../src/errors/invalid-google-token.error";
import { COOKIE_NAME, cookieToken, postJson, request, startServer } from "../helpers/server";
import {
  RUN,
  cleanupEmails,
  eventCountForEmail,
  eventCountForUser,
  identitiesOf,
  makeChallenge,
  sessionsOf,
  usersByEmail,
} from "../helpers/auth-db";

const PATH = "/api/auth/google";

// Indirizzi finti con il dominio scelto dal test (la regola dipende dal dominio).
const used: string[] = [];
const addr = (tag: string, domain: string) => {
  const e = `google-${RUN}-${tag}@${domain}`;
  used.push(e);
  return e;
};
const newSub = () => `sub-${crypto.randomUUID()}`;

type Claims = { sub: string; email: string; emailVerified: boolean; hd?: string };
const asGoogle = (c: Claims) => vi.spyOn(googleTokenSrv, "verify").mockResolvedValue(c);

let baseUrl: string;
let stop: () => Promise<void>;
const login = (idToken: unknown = "token-finto") => postJson(baseUrl, PATH, { idToken });

/** Utente già esistente con identità email (come dopo un login col codice). */
async function makeEmailUser(email: string): Promise<string> {
  const { rows } = await pool.query(`INSERT INTO users (email) VALUES ($1) RETURNING id`, [email]);
  await pool.query(
    `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider)
     VALUES ($1, 'email', $2, $2)`,
    [rows[0].id, email],
  );
  return rows[0].id;
}
const googleIdentities = async (userId: string) =>
  (await identitiesOf(userId)).filter((i) => i.provider === "google");
const countAll = async (table: "users" | "auth_identities" | "sessions") =>
  (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number;

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await cleanupEmails(used);
  await stop();
  await pool.end();
});

describe("POST /api/auth/google", () => {
  describe("validazione input", () => {
    it("body vuoto → 400", async () => {
      expect((await postJson(baseUrl, PATH, {})).status).toBe(400);
    });

    it("idToken non stringa → 400", async () => {
      expect((await login(12345)).status).toBe(400);
    });

    it("idToken vuoto → 400", async () => {
      expect((await login("")).status).toBe(400);
    });

    it("idToken oltre 4096 caratteri → 400", async () => {
      expect((await login("a".repeat(4097))).status).toBe(400);
    });
  });

  describe("token non valido", () => {
    it("la verifica lancia un errore → 401 InvalidGoogleToken, nessun cookie", async () => {
      vi.spyOn(googleTokenSrv, "verify").mockRejectedValue(new InvalidGoogleTokenError());
      const r = await login();
      expect(r.status).toBe(401);
      expect(r.body).toMatchObject({ error: "InvalidGoogleToken" });
      expect(cookieToken(r)).toBeNull();
    });

    it("stesso caso: nessun utente, identità, sessione o evento creato", async () => {
      vi.spyOn(googleTokenSrv, "verify").mockRejectedValue(new InvalidGoogleTokenError());
      const before = [await countAll("users"), await countAll("auth_identities"), await countAll("sessions")];
      const events = (await pool.query(`SELECT count(*)::int AS n FROM auth_events`)).rows[0].n;
      await login();
      expect([await countAll("users"), await countAll("auth_identities"), await countAll("sessions")]).toEqual(before);
      expect((await pool.query(`SELECT count(*)::int AS n FROM auth_events`)).rows[0].n).toBe(events);
    });
  });

  describe("utente nuovo", () => {
    it("@gmail.com → 200 {user:{id,email,displayName}}, cookie sid, identità e sessione google, login_success", async () => {
      const email = addr("new", "gmail.com");
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(200);
      expect(Object.keys(r.body)).toEqual(["user"]);
      expect(Object.keys(r.body.user).sort()).toEqual(["displayName", "email", "id"]);
      expect(r.body.user.email).toBe(email);
      expect(r.body.user.displayName).toBeNull();

      const token = cookieToken(r);
      expect(token).toBeTruthy();
      expect(JSON.stringify(r.body)).not.toContain(token!);
      const setCookie = r.cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`))!;
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);

      const [user] = await usersByEmail(email);
      expect(user.id).toBe(r.body.user.id);
      const ids = await googleIdentities(user.id);
      expect(ids).toHaveLength(1);
      expect(ids[0].provider_user_id).toBe(sub);
      const identityRow = (
        await pool.query(`SELECT email_at_provider FROM auth_identities WHERE user_id = $1 AND provider = 'google'`, [user.id])
      ).rows[0];
      expect(identityRow.email_at_provider).toBe(email);

      const sessions = await sessionsOf(user.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].auth_provider).toBe("google");

      expect(await eventCountForUser(user.id, "login_success")).toBe(1);
      expect(await eventCountForUser(user.id, "identity_linked")).toBe(0);
    });

    it("account Workspace (hd + email_verified) → 200", async () => {
      const email = addr("ws", "azienda-prova.it");
      asGoogle({ sub: newSub(), email, emailVerified: true, hd: "azienda-prova.it" });
      expect((await login()).status).toBe(200);
      expect(await usersByEmail(email)).toHaveLength(1);
    });

    it("email di terzi verificata da Google (libero.it, senza hd) → 200: account nuovo, identità e sessione google, login_success", async () => {
      const email = addr("terzi-new", "libero.it");
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(200);
      expect(cookieToken(r)).toBeTruthy();
      const [user] = await usersByEmail(email);
      expect(user.id).toBe(r.body.user.id);
      expect((await googleIdentities(user.id))[0].provider_user_id).toBe(sub);
      expect((await sessionsOf(user.id))[0].auth_provider).toBe("google");
      expect(await eventCountForUser(user.id, "login_success")).toBe(1);
    });

    it("email con maiuscole nel token → salvata minuscola", async () => {
      const lower = addr("case", "gmail.com");
      asGoogle({ sub: newSub(), email: lower.toUpperCase(), emailVerified: true });
      const r = await login();
      expect(r.status).toBe(200);
      expect(r.body.user.email).toBe(lower);
      expect(await usersByEmail(lower)).toHaveLength(1);
    });
  });

  describe("collegamento a un utente esistente", () => {
    it("identità email + stessa email @gmail.com → 200, stesso user.id, identità google aggiunta, identity_linked + login_success", async () => {
      const email = addr("link", "gmail.com");
      const userId = await makeEmailUser(email);
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(200);
      expect(r.body.user.id).toBe(userId);
      expect((await googleIdentities(userId))[0].provider_user_id).toBe(sub);
      expect((await identitiesOf(userId)).map((i) => i.provider).sort()).toEqual(["email", "google"]);
      expect(await eventCountForUser(userId, "identity_linked")).toBe(1);
      expect(await eventCountForUser(userId, "login_success")).toBe(1);
    });

    it("stesso caso con email di terzi → 403, nessuna identità google, nessuna sessione (invariante di sicurezza)", async () => {
      const email = addr("link-terzi", "libero.it");
      const userId = await makeEmailUser(email);
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ error: "GoogleEmailRejected" });
      expect(cookieToken(r)).toBeNull();
      expect(await googleIdentities(userId)).toHaveLength(0);
      expect(await sessionsOf(userId)).toHaveLength(0);
      expect(await eventCountForEmail(email, "google_untrusted_email_rejected")).toBe(1);
    });
  });

  describe("accesso di ritorno", () => {
    it("stesso sub due volte → 200, nessuna seconda identità, last_used_at aggiornato, nessun identity_linked", async () => {
      const email = addr("again", "gmail.com");
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const first = await login();
      expect(first.status).toBe(200);
      const userId = first.body.user.id;
      await pool.query(`UPDATE auth_identities SET last_used_at = now() - interval '1 hour' WHERE user_id = $1 AND provider = 'google'`, [userId]);

      const second = await login();
      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(userId);
      const ids = await googleIdentities(userId);
      expect(ids).toHaveLength(1);
      const { rows } = await pool.query(
        `SELECT (last_used_at > now() - interval '1 minute') AS fresh FROM auth_identities WHERE user_id = $1 AND provider = 'google'`,
        [userId],
      );
      expect(rows[0].fresh).toBe(true);
      expect(await eventCountForUser(userId, "identity_linked")).toBe(0);
      expect(await eventCountForUser(userId, "login_success")).toBe(2);
    });

    it("stesso sub con email cambiata nel token → entra nello stesso utente, nessun utente nuovo", async () => {
      const email = addr("changed-old", "gmail.com");
      const newEmail = addr("changed-new", "gmail.com");
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const first = await login();
      asGoogle({ sub, email: newEmail, emailVerified: true });
      const second = await login();

      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(first.body.user.id);
      expect(await usersByEmail(newEmail)).toHaveLength(0);
    });

    it("due richieste parallele con lo stesso sub nuovo → entrambe 200, un solo utente e una sola identità", async () => {
      const email = addr("race", "gmail.com");
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const [a, b] = await Promise.all([login(), login()]);

      expect([a.status, b.status]).toEqual([200, 200]);
      expect(a.body.user.id).toBe(b.body.user.id);
      const users = await usersByEmail(email);
      expect(users).toHaveLength(1);
      expect(await googleIdentities(users[0].id)).toHaveLength(1);
    });

    it("dopo un account creato da Google con email di terzi, il login col codice via email dà lo stesso utente e aggiunge l'identità email", async () => {
      const email = addr("terzi-otp", "libero.it");
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const g = await login();
      expect(g.status).toBe(200);

      const id = await makeChallenge(email, "424242");
      const r = await postJson(baseUrl, "/api/auth/email/verify", { challengeId: id, code: "424242" });
      expect(r.status).toBe(200);
      expect(r.body.user.id).toBe(g.body.user.id);
      expect((await identitiesOf(g.body.user.id)).map((i) => i.provider).sort()).toEqual(["email", "google"]);
    });
  });

  describe("rifiuti", () => {
    it("email di terzi con email_verified false → 403, nessun cookie, nessun utente, evento di rifiuto", async () => {
      const email = addr("terzi-unverified", "libero.it");
      asGoogle({ sub: newSub(), email, emailVerified: false });
      const r = await login();

      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ error: "GoogleEmailRejected" });
      expect(cookieToken(r)).toBeNull();
      expect(await usersByEmail(email)).toHaveLength(0);
      expect(await eventCountForEmail(email, "google_untrusted_email_rejected")).toBe(1);
    });

    it("l'evento di rifiuto ha provider google, metadata vuoti e subject_hash (HMAC, mai l'email)", async () => {
      const email = addr("event-shape", "libero.it");
      asGoogle({ sub: newSub(), email, emailVerified: false });
      await login();

      const { rows } = await pool.query(
        `SELECT provider, metadata, subject_hash FROM auth_events WHERE type = 'google_untrusted_email_rejected' AND subject_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      );
      expect(rows[0].provider).toBe("google");
      expect(rows[0].metadata).toEqual({});
      expect(rows[0].subject_hash).not.toContain("libero");
      expect(rows[0].subject_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("@gmail.com con email_verified false → 403, evento di rifiuto", async () => {
      const email = addr("gmail-unverified", "gmail.com");
      asGoogle({ sub: newSub(), email, emailVerified: false });
      const r = await login();
      expect(r.status).toBe(403);
      expect(cookieToken(r)).toBeNull();
      expect(await usersByEmail(email)).toHaveLength(0);
      expect(await eventCountForEmail(email, "google_untrusted_email_rejected")).toBe(1);
    });

    it("hd presente ma email_verified false → 403", async () => {
      const email = addr("hd-unverified", "azienda-prova.it");
      asGoogle({ sub: newSub(), email, emailVerified: false, hd: "azienda-prova.it" });
      const r = await login();
      expect(r.status).toBe(403);
      expect(await usersByEmail(email)).toHaveLength(0);
    });

    // Variante dell'approvato «utente anonimizzato con la stessa email»: l'anonimizzazione svuota
    // l'email e cancella le identità, quindi quel caso non esiste. Resta raggiungibile solo un dato
    // incoerente (identità google rimasta a un utente anonimizzato): come loginWithEmail, non si entra.
    it("identità google di un utente anonimizzato (dato incoerente) → 403, nessuna sessione, nessun evento di rifiuto", async () => {
      const email = addr("anon-inconsistent", "gmail.com");
      const sub = newSub();
      const { rows } = await pool.query(`INSERT INTO users (email, anonymized_at) VALUES ($1, now()) RETURNING id`, [email]);
      await pool.query(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider) VALUES ($1, 'google', $2, $3)`,
        [rows[0].id, sub, email],
      );
      asGoogle({ sub, email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(403);
      expect(cookieToken(r)).toBeNull();
      expect(await sessionsOf(rows[0].id)).toHaveLength(0);
      expect(await eventCountForEmail(email, "google_untrusted_email_rejected")).toBe(0);
    });

    // Aggiunto: il caso reale dopo l'anonimizzazione (email libera, identità cancellate).
    it("dopo l'anonimizzazione lo stesso sub e la stessa email creano un utente nuovo; la riga anonimizzata non cambia", async () => {
      const email = addr("anon-resignup", "gmail.com");
      const sub = newSub();
      asGoogle({ sub, email, emailVerified: true });
      const first = await login();
      const oldId = first.body.user.id;
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [oldId]);
      await pool.query(`DELETE FROM auth_identities WHERE user_id = $1`, [oldId]);
      await pool.query(`UPDATE users SET email = NULL, anonymized_at = now() WHERE id = $1`, [oldId]);

      const second = await login();
      expect(second.status).toBe(200);
      expect(second.body.user.id).not.toBe(oldId);
      const old = (await pool.query(`SELECT email, anonymized_at FROM users WHERE id = $1`, [oldId])).rows[0];
      expect(old.email).toBeNull();
      expect(old.anonymized_at).not.toBeNull();
      // l'utente anonimizzato non è più raggiungibile da cleanupEmails (email NULL): lo ripulisce qui
      await pool.query(`DELETE FROM auth_events WHERE user_id = $1`, [oldId]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [oldId]);
    });

    it("utente con un'altra identità google (sub diverso) e stessa email → 403, nessuna sessione né seconda identità", async () => {
      const email = addr("other-sub", "gmail.com");
      const userId = await makeEmailUser(email);
      await pool.query(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider) VALUES ($1, 'google', $2, $3)`,
        [userId, newSub(), email],
      );
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const r = await login();

      expect(r.status).toBe(403);
      expect(cookieToken(r)).toBeNull();
      expect(await googleIdentities(userId)).toHaveLength(1);
      expect(await sessionsOf(userId)).toHaveLength(0);
    });
  });

  describe("sessione e privacy", () => {
    it("dopo un login Google, GET /api/auth/me con quel cookie → 200 con lo stesso utente", async () => {
      const email = addr("me", "gmail.com");
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const r = await login();
      const me = await request(baseUrl, "/api/auth/me", { cookie: cookieToken(r)! });
      expect(me.status).toBe(200);
      expect(me.body.user.id).toBe(r.body.user.id);
    });

    it("nessuna colonna degli eventi dell'utente contiene l'email in chiaro", async () => {
      const email = addr("privacy", "gmail.com");
      asGoogle({ sub: newSub(), email, emailVerified: true });
      const r = await login();
      const { rows } = await pool.query(`SELECT metadata, subject_hash FROM auth_events WHERE user_id = $1`, [r.body.user.id]);
      expect(rows.length).toBeGreaterThan(0);
      expect(JSON.stringify(rows)).not.toContain(email);
      expect(JSON.stringify(rows)).not.toContain(email.split("@")[0]);
    });
  });
});
