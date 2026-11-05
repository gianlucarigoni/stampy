/**
 * isAuthenticated + GET /api/auth/me + POST /api/auth/logout
 *
 * Tocca il DB di sviluppo: le sessioni si creano direttamente con un token noto (in tabella
 * c'è solo lo SHA-256). Dati `auth-session-*@test.it`, eliminati in afterAll.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import authEventsSrv from "../../src/api/auth/auth-events/auth-events.service";
import { COOKIE_NAME, cookieToken, request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";
import { eventCountForUser, makeChallenge } from "../helpers/auth-db";

const fx = makeFixtures("auth-session");
let baseUrl: string;
let stop: () => Promise<void>;

const me = (cookie?: string) => request(baseUrl, "/api/auth/me", { cookie });
const logout = (cookie?: string) => request(baseUrl, "/api/auth/logout", { method: "POST", cookie });

async function sessionState(sessionId: string) {
  const r = await pool.query(
    `SELECT extract(epoch from last_seen_at)::float8 AS last_seen,
            extract(epoch from expires_at)::float8   AS expires,
            extract(epoch from created_at)::float8   AS created,
            extract(epoch from revoked_at)::float8   AS revoked
     FROM sessions WHERE id = $1`,
    [sessionId],
  );
  return r.rows[0];
}

// Tutti i 401 devono avere lo stesso corpo: non si distingue il motivo del rifiuto.
let unauthorizedBody: string | null = null;
function expectSame401(r: Res) {
  expect(r.status).toBe(401);
  const body = JSON.stringify(r.body ?? {});
  unauthorizedBody ??= body;
  expect(body).toBe(unauthorizedBody);
}

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/auth/me", () => {
  describe("cookie valido", () => {
    it("200 con l'utente mappato e nient'altro (nessun token nel body)", async () => {
      const u = await fx.newUser("ok", { displayName: "Mario Rossi" });
      const s = await fx.newSession(u.id);
      const r = await me(s.token);

      expect(r.status).toBe(200);
      expect(Object.keys(r.body)).toEqual(["user"]);
      expect(r.body.user).toEqual({ id: u.id, email: u.email, displayName: "Mario Rossi" });
      expect(JSON.stringify(r.body)).not.toContain(s.token);
    });

    it("richiesta ravvicinata: last_seen_at, expires_at e created_at non vengono riscritti", async () => {
      const u = await fx.newUser("close");
      const s = await fx.newSession(u.id);
      const a = await sessionState(s.sessionId);
      expect((await me(s.token)).status).toBe(200);
      expect(await sessionState(s.sessionId)).toEqual(a);
    });
  });

  describe("401 uniforme", () => {
    it("cookie assente", async () => {
      expectSame401(await request(baseUrl, "/api/auth/me"));
    });

    it("cookie alterato o malformato → 401 e la sessione valida non viene toccata", async () => {
      const u = await fx.newUser("tamper");
      const s = await fx.newSession(u.id);
      const before = await sessionState(s.sessionId);
      for (const token of [crypto.randomBytes(32).toString("base64url"), "abc", ""]) {
        expectSame401(await me(token));
      }
      expect((await sessionState(s.sessionId)).last_seen).toBe(before.last_seen);
    });

    it("sessione scaduta", async () => {
      const u = await fx.newUser("expired");
      expectSame401(await me((await fx.newSession(u.id, { expiresMinutesAgo: 1 })).token));
    });

    it("sessione revocata", async () => {
      const u = await fx.newUser("revoked");
      expectSame401(await me((await fx.newSession(u.id, { revoked: true })).token));
    });

    it("utente anonimizzato", async () => {
      const u = await fx.newUser("anon", { anonymized: true });
      expectSame401(await me((await fx.newSession(u.id)).token));
    });

    it("tetto assoluto superato (creata 91 giorni fa)", async () => {
      const u = await fx.newUser("cap91");
      const s = await fx.newSession(u.id, { createdDaysAgo: 91, lastSeenMinutesAgo: 10, expiresInDays: 1 });
      expectSame401(await me(s.token));
    });
  });

  describe("sessione scorrevole", () => {
    it("tocco dopo 10 minuti: last_seen_at va a ora e expires_at scorre a ~30 giorni", async () => {
      const u = await fx.newUser("slide");
      const s = await fx.newSession(u.id, { lastSeenMinutesAgo: 10, expiresInDays: 1 });
      const before = await sessionState(s.sessionId);
      expect((await me(s.token)).status).toBe(200);
      const after = await sessionState(s.sessionId);
      const now = Date.now() / 1000;

      expect(before.last_seen).toBeLessThan(now - 540);
      expect(before.expires).toBeLessThan(now + 2 * 86400);
      expect(after.last_seen).toBeGreaterThan(now - 60);
      expect(after.expires).toBeGreaterThan(now + 29 * 86400);
    });

    it("lo scorrimento rispetta il tetto assoluto: a 89 giorni expires_at non supera created_at + 90 giorni", async () => {
      const u = await fx.newUser("cap89");
      const s = await fx.newSession(u.id, { createdDaysAgo: 89, lastSeenMinutesAgo: 10, expiresInDays: 1 });
      const before = await sessionState(s.sessionId);
      expect((await me(s.token)).status).toBe(200);
      const after = await sessionState(s.sessionId);

      expect(after.last_seen).toBeGreaterThan(before.last_seen);
      expect(after.expires).toBeLessThanOrEqual(before.created + 90 * 86400 + 1);
    });
  });

  it("il cookie scritto dal login vero (verify con OTP) supera isAuthenticated e ha le opzioni attese", async () => {
    const email = fx.email("login");
    const id = await makeChallenge(email, "314159");
    const r = await request(baseUrl, "/api/auth/email/verify", { method: "POST", body: { challengeId: id, code: "314159" } });
    const cookieLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";

    expect(r.status).toBe(200);
    expect(cookieLine).toMatch(/httponly/i);
    expect(cookieLine).toMatch(/samesite=lax/i);
    expect(cookieLine).toMatch(/path=\//i);
    expect(cookieLine).toMatch(/max-age=77760\d\d/i); // ~90 giorni
    const m = await me(cookieToken(r)!);
    expect(m.status).toBe(200);
    expect(m.body.user.email).toBe(email);
  });
});

describe("POST /api/auth/logout", () => {
  it("204, cookie rimosso con le stesse opzioni, sessione revocata, un solo evento senza metadata", async () => {
    const u = await fx.newUser("logout");
    const s = await fx.newSession(u.id);
    const before = await sessionState(s.sessionId);

    const r = await logout(s.token);
    const clearLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
    const after = await sessionState(s.sessionId);
    const ev = (
      await pool.query(`SELECT provider, metadata FROM auth_events WHERE user_id = $1 AND type = 'logout'`, [u.id])
    ).rows;

    expect(r.status).toBe(204);
    expect(clearLine).toMatch(/^sid=;/);
    expect(clearLine).toMatch(/expires=thu, 01 jan 1970/i);
    expect(clearLine).toMatch(/httponly/i);
    expect(clearLine).toMatch(/samesite=lax/i);
    expect(clearLine).toMatch(/path=\//i);
    expect(after.revoked).not.toBeNull();
    expect(after.created).toBe(before.created);
    expect(ev).toHaveLength(1);
    expect(ev[0].provider).toBe("email");
    expect(ev[0].metadata).toEqual({});
  });

  it("dopo il logout la stessa sessione dà 401", async () => {
    const u = await fx.newUser("after");
    const s = await fx.newSession(u.id);
    await logout(s.token);
    expectSame401(await me(s.token));
  });

  it("logout ripetuto: 401, revoked_at invariato, nessun secondo evento", async () => {
    const u = await fx.newUser("twice");
    const s = await fx.newSession(u.id);
    await logout(s.token);
    const before = await sessionState(s.sessionId);

    expect((await logout(s.token)).status).toBe(401);
    expect((await sessionState(s.sessionId)).revoked).toBe(before.revoked);
    expect(await eventCountForUser(u.id, "logout")).toBe(1);
  });

  it("due logout simultanei: nessun 5xx, almeno una 204, un solo evento", async () => {
    const u = await fx.newUser("race");
    const s = await fx.newSession(u.id);
    const rs = await Promise.all([logout(s.token), logout(s.token)]);

    expect(rs.every((r) => r.status === 204 || r.status === 401)).toBe(true);
    expect(rs.some((r) => r.status === 204)).toBe(true);
    expect((await sessionState(s.sessionId)).revoked).not.toBeNull();
    expect(await eventCountForUser(u.id, "logout")).toBe(1);
  });
});

describe("auth_events.metadata: whitelist zod dentro log()", () => {
  it("metadata non previsti per il tipo → eccezione", async () => {
    const u = await fx.newUser("meta1");
    await expect(authEventsSrv.log("logout", { userId: u.id, metadata: { ip: "127.0.0.1" } } as any)).rejects.toThrow();
  });

  it("chiave extra su otp_failed → eccezione", async () => {
    const u = await fx.newUser("meta2");
    await expect(
      authEventsSrv.log("otp_failed", { userId: u.id, metadata: { attempts: 1, email: u.email } } as any),
    ).rejects.toThrow();
  });

  it("metadata validi → inserimento riuscito", async () => {
    const u = await fx.newUser("meta3");
    await authEventsSrv.log("otp_failed", { userId: u.id, metadata: { attempts: 2 } });
    expect(await eventCountForUser(u.id, "otp_failed")).toBe(1);
  });
});
