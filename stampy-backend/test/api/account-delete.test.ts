/**
 * POST /api/auth/account/delete/request e /delete/confirm (B4)
 *
 * Tocca il DB del worktree. Le sfide si creano direttamente nel DB con un codice noto.
 * Dati `account-del-*@test.it`, eliminati in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { COOKIE_NAME, cookieToken, postJson, request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";
import { getChallenge, makeChallenge } from "../helpers/auth-db";

const fx = makeFixtures("account-del");
let baseUrl: string;
let stop: () => Promise<void>;
let venue: string;

const reqCode = (cookie?: string, body?: unknown) =>
  request(baseUrl, "/api/auth/account/delete/request", { method: "POST", cookie, body });
const confirm = (cookie: string | undefined, body: unknown) =>
  request(baseUrl, "/api/auth/account/delete/confirm", { method: "POST", cookie, body });
const me = (cookie?: string) => request(baseUrl, "/api/auth/me", { cookie });
const userRow = async (id: string) =>
  (await pool.query(`SELECT email, display_name, anonymized_at FROM users WHERE id = $1`, [id])).rows[0];
const challengesFor = async (email: string) =>
  (await pool.query(`SELECT id, destination FROM otp_challenges WHERE destination = $1`, [email])).rows;

const CODE = "123456";

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venue = await fx.newVenue("a");
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("POST /api/auth/account/delete/request", () => {
  it("senza sessione → 401", async () => {
    expect((await reqCode()).status).toBe(401);
  });

  it("con sessione → 202 {challengeId}; la sfida è per l'email dell'utente", async () => {
    const u = await fx.newUserWithSession("req-ok");
    const r = await reqCode(u.token);

    expect(r.status).toBe(202);
    expect(Object.keys(r.body)).toEqual(["challengeId"]);
    const rows = await challengesFor(u.email);
    expect(rows.map((x) => x.id)).toEqual([r.body.challengeId]);
  });

  it("ignora un'email nel body: il codice va sempre all'utente di sessione", async () => {
    const u = await fx.newUserWithSession("req-body");
    const victim = fx.email("req-body-victim");

    const r = await reqCode(u.token, { email: victim });

    expect(r.status).toBe(202);
    expect(await challengesFor(victim)).toHaveLength(0);
    expect(await challengesFor(u.email)).toHaveLength(1);
  });

  it("owner, staff e admin di piattaforma → 403 identico, nessuna sfida creata", async () => {
    const owner = await fx.newUserWithSession("req-owner");
    await fx.addMember(owner.id, venue, "owner");
    const staff = await fx.newUserWithSession("req-staff");
    await fx.addMember(staff.id, venue, "staff");
    const admin = await fx.newUserWithSession("req-admin");
    await pool.query(`UPDATE users SET is_platform_admin = true WHERE id = $1`, [admin.id]);

    const rs = [await reqCode(owner.token), await reqCode(staff.token), await reqCode(admin.token)];

    for (const r of rs) {
      expect(r.status).toBe(403);
      expect(r.body).toEqual(rs[0].body);
    }
    for (const u of [owner, staff, admin]) expect(await challengesFor(u.email)).toHaveLength(0);
  });

  it("seconda richiesta subito dopo → 429 con Retry-After (cooldown OTP)", async () => {
    const u = await fx.newUserWithSession("req-cool");
    expect((await reqCode(u.token)).status).toBe(202);

    const r = await reqCode(u.token);

    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/account/delete/confirm", () => {
  it("senza sessione → 401", async () => {
    const id = await makeChallenge(fx.email("conf-401"), CODE);
    expect((await confirm(undefined, { challengeId: id, code: CODE })).status).toBe(401);
  });

  it("codice di formato non valido → 400 e nessuna modifica", async () => {
    const u = await fx.newUserWithSession("conf-fmt");
    const id = await makeChallenge(u.email, CODE);

    expect((await confirm(u.token, { challengeId: id, code: "12ab" })).status).toBe(400);
    expect((await userRow(u.id)).anonymized_at).toBeNull();
  });

  describe("codice giusto", () => {
    it("204, cookie rimosso, utente anonimizzato, vecchia sessione → 401", async () => {
      const u = await fx.newUserWithSession("conf-ok", {});
      const id = await makeChallenge(u.email, CODE);

      const r = await confirm(u.token, { challengeId: id, code: CODE });

      expect(r.status).toBe(204);
      const clearLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
      expect(clearLine).toMatch(/^sid=;/);
      expect(clearLine).toMatch(/expires=thu, 01 jan 1970/i);
      const row = await userRow(u.id);
      expect(row.email).toBeNull();
      expect(row.anonymized_at).not.toBeNull();
      expect((await me(u.token)).status).toBe(401);
      expect((await getChallenge(id)).consumed_at).not.toBeNull();
    });

    it("la stessa email può rifare il login: nasce un utente nuovo", async () => {
      const u = await fx.newUserWithSession("conf-relogin");
      const id = await makeChallenge(u.email, CODE);
      expect((await confirm(u.token, { challengeId: id, code: CODE })).status).toBe(204);

      const id2 = await makeChallenge(u.email, "654321");
      const login = await postJson(baseUrl, "/api/auth/email/verify", { challengeId: id2, code: "654321" });

      expect(login.status).toBe(200);
      expect(login.body.user.id).not.toBe(u.id);
      expect(login.body.user.email).toBe(u.email);
      expect(cookieToken(login)).not.toBeNull();
    });
  });

  describe("codice non accettato", () => {
    it("sbagliato su sfida viva → 400 InvalidCode con attemptsRemaining, nessuna modifica", async () => {
      const u = await fx.newUserWithSession("conf-bad");
      const id = await makeChallenge(u.email, CODE);

      const r = await confirm(u.token, { challengeId: id, code: "000000" });

      expect(r.status).toBe(400);
      expect(r.body.error).toBe("InvalidCode");
      expect(r.body.attemptsRemaining).toBe(4);
      expect((await userRow(u.id)).anonymized_at).toBeNull();
      expect((await me(u.token)).status).toBe(200);
    });

    it("scaduto → 400 CodeExpired, nessuna modifica", async () => {
      const u = await fx.newUserWithSession("conf-exp");
      const id = await makeChallenge(u.email, CODE, { expiredSecondsAgo: 60 });

      const r = await confirm(u.token, { challengeId: id, code: CODE });

      expect(r.status).toBe(400);
      expect(r.body.error).toBe("CodeExpired");
      expect((await userRow(u.id)).anonymized_at).toBeNull();
    });

    it("già usato → 400 CodeExpired, nessuna modifica", async () => {
      const u = await fx.newUserWithSession("conf-used");
      const id = await makeChallenge(u.email, CODE);
      await pool.query(`UPDATE otp_challenges SET consumed_at = now() WHERE id = $1`, [id]);

      const r = await confirm(u.token, { challengeId: id, code: CODE });

      expect(r.status).toBe(400);
      expect(r.body.error).toBe("CodeExpired");
      expect((await userRow(u.id)).anonymized_at).toBeNull();
    });

    it("sfida valida di un ALTRO indirizzo → 400 CodeExpired, nessuna modifica per nessuno", async () => {
      const u = await fx.newUserWithSession("conf-other");
      const attackerEmail = fx.email("conf-other-attacker");
      const id = await makeChallenge(attackerEmail, CODE);

      const r = await confirm(u.token, { challengeId: id, code: CODE });

      expect(r.status).toBe(400);
      expect(r.body.error).toBe("CodeExpired");
      expect((await userRow(u.id)).anonymized_at).toBeNull();
    });
  });

  it("diventato owner/staff tra richiesta e conferma → 403, nessuna modifica", async () => {
    const u = await fx.newUserWithSession("conf-race");
    const id = await makeChallenge(u.email, CODE);
    await fx.addMember(u.id, venue, "staff");

    const r: Res = await confirm(u.token, { challengeId: id, code: CODE });

    expect(r.status).toBe(403);
    expect((await userRow(u.id)).anonymized_at).toBeNull();
    expect((await me(u.token)).status).toBe(200);
  });
});
