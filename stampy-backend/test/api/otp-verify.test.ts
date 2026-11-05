/**
 * POST /api/auth/email/verify
 *
 * Tocca il DB di sviluppo (crea utenti, sfide, sessioni, eventi con email `otp-verify-*@test.it`
 * e li elimina in afterAll). Non passa dall'invio email: crea le sfide direttamente nel DB.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { COOKIE_NAME, cookieToken, postJson, startServer, type Res } from "../helpers/server";
import {
  cleanupEmails,
  eventCountForEmail,
  eventCountForUser,
  getChallenge,
  identitiesOf,
  makeChallenge,
  makeEmailTracker,
  sessionsOf,
  sha256,
  usersByEmail,
} from "../helpers/auth-db";

const PATH = "/api/auth/email/verify";
const { email: mail, used } = makeEmailTracker("otp-verify");

let baseUrl: string;
let stop: () => Promise<void>;
const verify = (body: unknown) => postJson(baseUrl, PATH, body);

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await cleanupEmails(used);
  await stop();
  await pool.end();
});

// "non valido" = codice sbagliato su sfida viva; "scaduto" = sfida non più utilizzabile
const expectInvalid = (r: Res, remaining: number) => {
  expect(r.status).toBe(400);
  expect(r.body).toMatchObject({ error: "InvalidCode", message: "Codice non valido", attemptsRemaining: remaining });
};
const expectExpired = (r: Res) => {
  expect(r.status).toBe(400);
  expect(r.body).toMatchObject({ error: "CodeExpired", message: "Codice scaduto" });
  expect(r.body.attemptsRemaining).toBeUndefined();
};

describe("POST /api/auth/email/verify", () => {
  describe("validazione input", () => {
    it("body vuoto → 400", async () => {
      expect((await verify({})).status).toBe(400);
    });

    it("challengeId non UUID → 400", async () => {
      expect((await verify({ challengeId: "non-un-uuid", code: "123456" })).status).toBe(400);
    });

    it("codice con lettere, 5 cifre, 7 cifre o numero → 400 senza consumare tentativi", async () => {
      const id = await makeChallenge(mail("validation"), "000000");
      for (const code of ["abcdef", "12345", "1234567", 123456]) {
        expect((await verify({ challengeId: id, code })).status).toBe(400);
      }
      expect((await getChallenge(id)).attempts).toBe(0);
    });
  });

  describe("codice giusto, utente nuovo", () => {
    it("200 con cookie di sessione; crea utente, identità e sessione; sfida consumata", async () => {
      const email = mail("new");
      const id = await makeChallenge(email, "424242");
      const r = await verify({ challengeId: id, code: "424242" });

      expect(r.status).toBe(200);
      expect(Object.keys(r.body)).toEqual(["user"]);
      expect(Object.keys(r.body.user).sort()).toEqual(["displayName", "email", "id"]);

      const token = cookieToken(r);
      expect(token).toBeTruthy();
      expect(JSON.stringify(r.body)).not.toContain(token!);

      const cookieLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
      expect(cookieLine).toMatch(/httponly/i);
      expect(cookieLine).toMatch(/samesite=lax/i);
      // tetto assoluto della sessione: 90 giorni
      expect(cookieLine).toMatch(/max-age=77760\d\d|expires=/i);

      const users = await usersByEmail(email);
      expect(users).toHaveLength(1);
      const ids = await identitiesOf(users[0].id);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatchObject({ provider: "email", provider_user_id: email });

      const sess = await sessionsOf(users[0].id);
      expect(sess).toHaveLength(1);
      expect(sess[0].token_hash).toBe(sha256(token!));
      expect(sess[0].auth_provider).toBe("email");

      const c = await getChallenge(id);
      expect(c.consumed_at).toBeTruthy();
      expect(c.invalidated_at).toBeNull();

      expect(await eventCountForUser(users[0].id, "otp_verified")).toBe(1);
      expect(await eventCountForUser(users[0].id, "login_success")).toBe(1);
      expect(await eventCountForUser(users[0].id, "identity_linked")).toBe(0);
    });

    it("nessuna email in chiaro in auth_events", async () => {
      const email = mail("noplain");
      const id = await makeChallenge(email, "123123");
      await verify({ challengeId: id, code: "123123" });
      const r = await pool.query(
        `SELECT count(*)::int AS n FROM auth_events
         WHERE subject_hash = $1 OR metadata::text ILIKE '%' || $1 || '%' OR metadata::text ILIKE '%otp-verify-%'`,
        [email],
      );
      expect(r.rows[0].n).toBe(0);
    });
  });

  describe("riuso del codice", () => {
    it("stesso codice due volte → il secondo è 400 generico, senza cookie né seconda sessione", async () => {
      const email = mail("reuse");
      const id = await makeChallenge(email, "111111");
      const first = await verify({ challengeId: id, code: "111111" });
      const second = await verify({ challengeId: id, code: "111111" });

      expect(first.status).toBe(200);
      expectExpired(second);
      expect(cookieToken(second)).toBeNull();
      const u = (await usersByEmail(email))[0];
      expect(await sessionsOf(u.id)).toHaveLength(1);
    });
  });

  describe("codice errato", () => {
    it("400 generico, tentativi +1, evento otp_failed, sfida ancora viva, nessun utente", async () => {
      const email = mail("wrong");
      const id = await makeChallenge(email, "222222");
      const r = await verify({ challengeId: id, code: "999999" });

      expectInvalid(r, 4);
      expect(JSON.stringify(r.body)).not.toContain(id);
      expect(cookieToken(r)).toBeNull();
      const c = await getChallenge(id);
      expect(c.attempts).toBe(1);
      expect(c.consumed_at).toBeNull();
      expect(c.invalidated_at).toBeNull();
      expect(await eventCountForEmail(email, "otp_failed")).toBe(1);
      expect(await usersByEmail(email)).toHaveLength(0);
    });

    it("5 codici errati invalidano la sfida: il sesto, anche col codice giusto, fallisce", async () => {
      const email = mail("five");
      const id = await makeChallenge(email, "333333");
      for (let i = 1; i <= 5; i++) {
        expectInvalid(await verify({ challengeId: id, code: "000001" }), 5 - i);
      }
      const c = await getChallenge(id);
      expect(c.attempts).toBe(5);
      expect(c.invalidated_at).toBeTruthy();

      expectExpired(await verify({ challengeId: id, code: "333333" }));
      expect(await usersByEmail(email)).toHaveLength(0);
      expect(await eventCountForEmail(email, "otp_failed")).toBe(5);
    });

    it("4 errati + il quinto giusto → 200 (il quinto tentativo è ancora valido)", async () => {
      const email = mail("fifth");
      const id = await makeChallenge(email, "444444");
      for (let i = 0; i < 4; i++) await verify({ challengeId: id, code: "000001" });
      const r = await verify({ challengeId: id, code: "444444" });
      expect(r.status).toBe(200);
      expect(await usersByEmail(email)).toHaveLength(1);
    });

    it("sfida già a 5 tentativi (anche non invalidata) + codice giusto → 400", async () => {
      const email = mail("exhausted");
      const id = await makeChallenge(email, "555555", { attempts: 5 });
      expectExpired(await verify({ challengeId: id, code: "555555" }));
      expect(await usersByEmail(email)).toHaveLength(0);
    });
  });

  describe("sfida scaduta, invalidata o inesistente", () => {
    it("scaduta → 400 scaduto, tentativi non incrementati, non consumata", async () => {
      const email = mail("expired");
      const id = await makeChallenge(email, "666666", { expiredSecondsAgo: 10 });
      expectExpired(await verify({ challengeId: id, code: "666666" }));
      const c = await getChallenge(id);
      expect(c.attempts).toBe(0);
      expect(c.consumed_at).toBeNull();
      expect(await usersByEmail(email)).toHaveLength(0);
    });

    it("sostituita da un nuovo invio → il vecchio codice non funziona più", async () => {
      const email = mail("replaced");
      const oldId = await makeChallenge(email, "777777");
      await makeChallenge(email, "888888"); // chiude la precedente, come farebbe un nuovo invio
      expectExpired(await verify({ challengeId: oldId, code: "777777" }));
      expect(await usersByEmail(email)).toHaveLength(0);
    });

    it("challengeId inesistente → stessa risposta di una sfida morta", async () => {
      expectExpired(await verify({ challengeId: crypto.randomUUID(), code: "123456" }));
    });
  });

  describe("utente già esistente", () => {
    it("senza identità email → 200, stesso utente, identità aggiunta, evento identity_linked", async () => {
      const email = mail("existing-noident");
      const ins = await pool.query(`INSERT INTO users (email) VALUES ($1) RETURNING id`, [email]);
      const userId: string = ins.rows[0].id;
      const id = await makeChallenge(email, "515151");
      const r = await verify({ challengeId: id, code: "515151" });

      expect(r.status).toBe(200);
      expect(r.body.user.id).toBe(userId);
      expect(await usersByEmail(email)).toHaveLength(1);
      const ids = await identitiesOf(userId);
      expect(ids).toHaveLength(1);
      expect(ids[0].provider).toBe("email");
      expect(await eventCountForUser(userId, "identity_linked")).toBe(1);
      expect(await eventCountForUser(userId, "login_success")).toBe(1);
    });

    it("con identità → 200, nessun identity_linked, nuova sessione con token diverso, last_used_at valorizzato", async () => {
      const email = mail("existing-ident");
      const first = await verify({ challengeId: await makeChallenge(email, "101010"), code: "101010" });
      const u = (await usersByEmail(email))[0];
      const before = await sessionsOf(u.id);

      const r = await verify({ challengeId: await makeChallenge(email, "616161"), code: "616161" });

      expect(r.status).toBe(200);
      expect(r.body.user.id).toBe(u.id);
      expect(await eventCountForUser(u.id, "identity_linked")).toBe(0);
      expect(await sessionsOf(u.id)).toHaveLength(before.length + 1);
      expect(cookieToken(r)).not.toBe(cookieToken(first));
      const ids = await identitiesOf(u.id);
      expect(ids).toHaveLength(1);
      expect(ids[0].last_used_at).toBeTruthy();
    });
  });

  describe("concorrenza", () => {
    it("5 verify simultanee col codice giusto → una 200, quattro 400, un utente, una sessione", async () => {
      const email = mail("race");
      const id = await makeChallenge(email, "919191");
      const rs = await Promise.all(Array.from({ length: 5 }, () => verify({ challengeId: id, code: "919191" })));

      expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
      expect(rs.filter((r) => r.status === 400)).toHaveLength(4);
      expect(rs.filter((r) => r.status >= 500)).toHaveLength(0);
      const users = await usersByEmail(email);
      expect(users).toHaveLength(1);
      expect(await sessionsOf(users[0].id)).toHaveLength(1);
      expect(await eventCountForUser(users[0].id, "login_success")).toBe(1);
    });
  });
});
