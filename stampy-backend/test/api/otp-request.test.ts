/**
 * POST /api/auth/email/request
 *
 * Tocca il DB di sviluppo (sfide OTP ed eventi per email `otp-test-*@test.it`, eliminati in afterAll).
 * Per simulare il passare del tempo si "invecchia" la sfida riscrivendo created_at.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";
import { eventCountForEmail } from "../helpers/auth-db";

const PATH = "/api/auth/email/request";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fx = makeFixtures("otp-test");
let baseUrl: string;
let stop: () => Promise<void>;

const send = (body: unknown): Promise<Res> => request(baseUrl, PATH, { method: "POST", body });
const retryAfter = (r: Res) => (r.headers.get("retry-after") ? Number(r.headers.get("retry-after")) : null);

const age = (email: string, seconds: number) =>
  pool.query(`UPDATE otp_challenges SET created_at = created_at - make_interval(secs => $2) WHERE destination = $1`, [email, seconds]);
const count = async (email: string, where = "TRUE") =>
  (await pool.query(`SELECT count(*)::int AS n FROM otp_challenges WHERE destination = $1 AND ${where}`, [email])).rows[0].n as number;
const alive = (email: string) => count(email, "consumed_at IS NULL AND invalidated_at IS NULL");
const total = (email: string) => count(email);

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("POST /api/auth/email/request", () => {
  describe("validazione input e routing", () => {
    it("JSON malformato → 400 MalformedBody (non 500)", async () => {
      const r = await fetch(baseUrl + PATH, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
      expect(r.status).toBe(400);
      expect((await r.json()).error).toBe("MalformedBody");
    });

    it("email non valida → 400, senza eco dell'input né `value` nei dettagli", async () => {
      const r = await send({ email: "non-una-email" });
      expect(r.status).toBe(400);
      expect(Array.isArray(r.body.details)).toBe(true);
      expect(r.body.details.every((d: any) => !("value" in d))).toBe(true);
      expect(JSON.stringify(r.body)).not.toContain("non-una-email");
    });

    it.each([
      ["body vuoto", {}],
      ["email numerica", { email: 12345 }],
      ["email di 298 caratteri", { email: "a".repeat(290) + "@test.it" }],
    ])("%s → 400", async (_label, body) => {
      expect((await send(body)).status).toBe(400);
    });

    it("rotta /api inesistente → 404 JSON NotFound", async () => {
      const r = await request(baseUrl, "/api/non-esiste");
      expect(r.status).toBe(404);
      expect(r.body.error).toBe("NotFound");
    });

    it("metodo GET sulla rotta → 404", async () => {
      expect((await request(baseUrl, PATH)).status).toBe(404);
    });
  });

  describe("caso felice", () => {
    it("202 con solo challengeId; sfida con HMAC hex, 0 tentativi, scadenza 300 s; evento otp_sent", async () => {
      const email = fx.email("ok");
      const r = await send({ email });
      const row = (
        await pool.query(
          `SELECT code_hash, attempts, extract(epoch from (expires_at - created_at))::int AS ttl FROM otp_challenges WHERE id = $1`,
          [r.body.challengeId],
        )
      ).rows[0];

      expect(r.status).toBe(202);
      expect(Object.keys(r.body)).toEqual(["challengeId"]);
      expect(r.body.challengeId).toMatch(UUID);
      expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.attempts).toBe(0);
      expect(row.ttl).toBe(300);
      expect(await alive(email)).toBe(1);
      expect(await eventCountForEmail(email, "otp_sent")).toBe(1);
    });

    it("l'email con maiuscole viene salvata in minuscolo", async () => {
      const email = fx.email("case");
      expect((await send({ email: email.toUpperCase() })).status).toBe(202);
      expect(await total(email)).toBe(1);
    });

    it("risposta identica per email di utente esistente e inesistente (nessun leak)", async () => {
      const existing = await fx.newUser("exists");
      const a = await send({ email: existing.email });
      const b = await send({ email: fx.email("nouser") });
      expect(a.status).toBe(b.status);
      expect(Object.keys(a.body)).toEqual(Object.keys(b.body));
    });
  });

  describe("cooldown di 45 s", () => {
    it("seconda richiesta subito dopo → 429 con Retry-After, la sfida viva resta la stessa", async () => {
      const email = fx.email("cooldown");
      await send({ email });
      const before = (await pool.query(`SELECT id FROM otp_challenges WHERE destination = $1`, [email])).rows[0].id;
      const r = await send({ email });

      expect(r.status).toBe(429);
      expect(retryAfter(r)).toBeGreaterThanOrEqual(1);
      expect(retryAfter(r)).toBeLessThanOrEqual(45);
      expect(r.body).toMatchObject({ error: "TryLaterError", message: "Riprova più tardi" });
      expect(r.body.retryAfterSeconds).toBe(retryAfter(r));
      expect(await total(email)).toBe(1);
      expect((await pool.query(`SELECT id FROM otp_challenges WHERE destination = $1`, [email])).rows[0].id).toBe(before);
      expect(await eventCountForEmail(email, "otp_send_blocked")).toBeGreaterThanOrEqual(1);
    });

    it("dopo il cooldown (sfida invecchiata di 60 s) → 202 e la vecchia viene invalidata", async () => {
      const email = fx.email("after-cooldown");
      await send({ email });
      await age(email, 60);
      expect((await send({ email })).status).toBe(202);
      expect(await total(email)).toBe(2);
      expect(await count(email, "invalidated_at IS NOT NULL")).toBe(1);
      expect(await alive(email)).toBe(1);
    });
  });

  describe("cooldown saltato se l'ultimo codice è morto", () => {
    it("tentativi esauriti → nuovo invio subito (202)", async () => {
      const email = fx.email("dead-attempts");
      await send({ email });
      await pool.query(`UPDATE otp_challenges SET attempts = 5, invalidated_at = now() WHERE destination = $1`, [email]);
      expect((await send({ email })).status).toBe(202);
      expect(await total(email)).toBe(2);
      expect(await alive(email)).toBe(1);
    });

    it("codice scaduto → nuovo invio subito (202)", async () => {
      const email = fx.email("dead-expired");
      await send({ email });
      await pool.query(`UPDATE otp_challenges SET expires_at = now() - interval '1 second' WHERE destination = $1`, [email]);
      expect((await send({ email })).status).toBe(202);
      expect(await alive(email)).toBe(1);
    });

    it("codice ancora vivo, anche con 4 errori → il cooldown vale ancora (429)", async () => {
      const email = fx.email("live-4");
      await send({ email });
      await pool.query(`UPDATE otp_challenges SET attempts = 4 WHERE destination = $1`, [email]);
      expect((await send({ email })).status).toBe(429);
      expect(await total(email)).toBe(1);
    });

    it("codice consumato (login riuscito al quinto tentativo) → il cooldown vale ancora (429)", async () => {
      const email = fx.email("consumed-5");
      await send({ email });
      await pool.query(`UPDATE otp_challenges SET attempts = 5, consumed_at = now() WHERE destination = $1`, [email]);
      expect((await send({ email })).status).toBe(429);
    });
  });

  describe("tetto di 5 invii/ora", () => {
    it("5 invii ok, il sesto → 429 con Retry-After ~3300 s e la quinta sfida resta viva", async () => {
      const email = fx.email("hourly");
      for (let i = 1; i <= 5; i++) {
        expect((await send({ email })).status).toBe(202);
        await age(email, 60);
      }
      const r6 = await send({ email });

      expect(r6.status).toBe(429);
      expect(retryAfter(r6)).toBeGreaterThan(2900);
      expect(retryAfter(r6)).toBeLessThanOrEqual(3600);
      expect(await alive(email)).toBe(1); // niente invalidazione prematura
      expect(await total(email)).toBe(5);
      expect(await eventCountForEmail(email, "otp_send_blocked")).toBeGreaterThanOrEqual(1);
    });

    it("dopo la finestra oraria (tutto invecchiato di 1 ora) → 202", async () => {
      const email = fx.email("hourly-window");
      for (let i = 1; i <= 5; i++) {
        await send({ email });
        await age(email, 60);
      }
      await age(email, 3600);
      expect((await send({ email })).status).toBe(202);
    });

    it("le sfide morte non aggirano il tetto: 5 invii bruciati → il sesto è 429", async () => {
      const email = fx.email("dead-hourly");
      for (let i = 1; i <= 5; i++) {
        expect((await send({ email })).status).toBe(202);
        await pool.query(
          `UPDATE otp_challenges SET attempts = 5, invalidated_at = now() WHERE destination = $1 AND invalidated_at IS NULL`,
          [email],
        );
      }
      const r6 = await send({ email });
      expect(r6.status).toBe(429);
      expect(retryAfter(r6)).toBeGreaterThan(45); // è il tetto orario, non il cooldown
    });
  });

  describe("concorrenza", () => {
    it("5 richieste simultanee sullo stesso destinatario → una 202, le altre 429, nessun 5xx, una sola sfida", async () => {
      const email = fx.email("race");
      const rs = await Promise.all(Array.from({ length: 5 }, () => send({ email })));

      expect(rs.filter((r) => r.status === 202)).toHaveLength(1);
      expect(rs.filter((r) => r.status === 429)).toHaveLength(4);
      expect(rs.filter((r) => r.status >= 500)).toHaveLength(0);
      expect(await alive(email)).toBe(1);
      expect(await total(email)).toBe(1);
    });
  });
});
