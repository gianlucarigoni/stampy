/**
 * POST /api/auth/email/request: concorrenza (issue #36, T2).
 *
 * Il test "5 richieste simultanee" di otp-request.test.ts è fallito una volta sola e non si è più
 * riprodotto. Qui la race si stressa (molti giri, più richieste) e si simula in modo deterministico.
 * Usa il DB del worktree (email `otp-race-*@test.it`, eliminate in afterAll).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import otpSrv from "../../src/api/auth/otp/otp.service";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";
import { eventCountForEmail } from "../helpers/auth-db";

const PATH = "/api/auth/email/request";
const fx = makeFixtures("otp-race");
let baseUrl: string;
let stop: () => Promise<void>;

const send = (email: string): Promise<Res> => request(baseUrl, PATH, { method: "POST", body: { email } });
const burst = (n: number, email: string | ((i: number) => string)) =>
  Promise.all(Array.from({ length: n }, (_, i) => send(typeof email === "string" ? email : email(i))));

const count = async (email: string, where = "TRUE") =>
  (await pool.query(`SELECT count(*)::int AS n FROM otp_challenges WHERE destination = $1 AND ${where}`, [email])).rows[0]
    .n as number;
const alive = (email: string) => count(email, "consumed_at IS NULL AND invalidated_at IS NULL");
const total = (email: string) => count(email);
const age = (email: string, seconds: number) =>
  pool.query(`UPDATE otp_challenges SET created_at = created_at - make_interval(secs => $2) WHERE destination = $1`, [email, seconds]);
const by = (rs: Res[], status: number) => rs.filter((r) => r.status === status);

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("POST /api/auth/email/request: concorrenza", () => {
  describe("raffica sullo stesso destinatario", () => {
    it("30 giri da 5 richieste simultanee → in ogni giro 1×202 e 4×429, nessun 5xx, una sola sfida viva", async () => {
      const problems: string[] = [];
      for (let i = 0; i < 30; i++) {
        const email = fx.email(`loop-${i}`);
        const rs = await burst(5, email);
        const st = rs.map((r) => r.status).sort().join(",");
        const a = await alive(email);
        const t = await total(email);
        if (st !== "202,429,429,429,429" || a !== 1 || t !== 1) problems.push(`giro ${i}: stati ${st}, vive ${a}, totali ${t}`);
      }
      expect(problems).toEqual([]);
    }, 120_000);

    it("20 richieste simultanee → una sola 202, 19×429, nessun 5xx", async () => {
      const email = fx.email("twenty");
      const rs = await burst(20, email);

      expect(by(rs, 202)).toHaveLength(1);
      expect(by(rs, 429)).toHaveLength(19);
      expect(rs.filter((r) => r.status >= 500)).toHaveLength(0);
      expect(await total(email)).toBe(1);
    });

    it("la sfida viva nel DB è quella del challengeId restituito dalla 202 e non risulta invalidata", async () => {
      const email = fx.email("same-id");
      const rs = await burst(5, email);
      const ok = by(rs, 202)[0];
      const rows = (await pool.query(`SELECT id, invalidated_at FROM otp_challenges WHERE destination = $1`, [email])).rows;

      expect(ok).toBeDefined();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(ok.body.challengeId);
      expect(rows[0].invalidated_at).toBeNull();
    });

    it("eventi: un solo otp_sent e tanti otp_send_blocked quante sono le 429", async () => {
      const email = fx.email("events");
      const rs = await burst(5, email);

      expect(await eventCountForEmail(email, "otp_sent")).toBe(1);
      expect(await eventCountForEmail(email, "otp_send_blocked")).toBe(by(rs, 429).length);
    });

    it("race simulata: una sfida viva compare tra la lettura delle statistiche e l'invalidazione → 429, la sfida già viva non viene invalidata", async () => {
      const email = fx.email("simulated");
      const inserted: { id?: string } = {};
      const original = (otpSrv as any).invalidateLiveChallenge.bind(otpSrv);
      // Simula l'altra richiesta che ha già fatto commit proprio in questo punto.
      vi.spyOn(otpSrv as any, "invalidateLiveChallenge").mockImplementationOnce(async (...args: unknown[]) => {
        const r = await pool.query(
          `INSERT INTO otp_challenges (id, channel, destination, code_hash, expires_at)
           VALUES (gen_random_uuid(), 'email', $1, repeat('a', 64), now() + interval '5 minutes') RETURNING id`,
          [email],
        );
        inserted.id = r.rows[0].id;
        return original(...args);
      });

      const r = await send(email);
      const rows = (await pool.query(`SELECT id, invalidated_at FROM otp_challenges WHERE destination = $1`, [email])).rows;

      expect(r.status).toBe(429);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(inserted.id);
      expect(rows[0].invalidated_at).toBeNull();
    });
  });

  describe("casi limite", () => {
    it("richieste simultanee su 2 email diverse → ognuna ottiene la sua 202, senza interferenze", async () => {
      const a = fx.email("two-a");
      const b = fx.email("two-b");
      const rs = await burst(6, (i) => (i % 2 === 0 ? a : b));

      expect(by(rs, 202)).toHaveLength(2);
      expect(by(rs, 429)).toHaveLength(4);
      expect(await alive(a)).toBe(1);
      expect(await alive(b)).toBe(1);
      expect(await total(a)).toBe(1);
      expect(await total(b)).toBe(1);
    });

    it("raffica dopo il cooldown (sfida invecchiata di 60 s) → una sola 202; la vecchia è invalidata, la nuova è viva", async () => {
      const email = fx.email("after-cooldown");
      expect((await send(email)).status).toBe(202);
      await age(email, 60);
      const rs = await burst(5, email);

      expect(by(rs, 202)).toHaveLength(1);
      expect(by(rs, 429)).toHaveLength(4);
      expect(await total(email)).toBe(2);
      expect(await count(email, "invalidated_at IS NOT NULL")).toBe(1);
      expect(await alive(email)).toBe(1);
    });

    it("raffica con il tetto orario già raggiunto (5 invii) → nessuna 202, tutte 429 con Retry-After oltre 45 s", async () => {
      const email = fx.email("hourly");
      for (let i = 0; i < 5; i++) {
        expect((await send(email)).status).toBe(202);
        await age(email, 60);
      }
      const rs = await burst(5, email);

      expect(by(rs, 202)).toHaveLength(0);
      expect(by(rs, 429)).toHaveLength(5);
      for (const r of rs) expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(45);
      expect(await total(email)).toBe(5);
    });

    it("raffica con la stessa email in maiuscolo e minuscolo mischiati → un solo destinatario, una sola 202", async () => {
      const email = fx.email("mixed-case");
      const rs = await burst(6, (i) => (i % 2 === 0 ? email : email.toUpperCase()));

      expect(by(rs, 202)).toHaveLength(1);
      expect(by(rs, 429)).toHaveLength(5);
      expect(await total(email)).toBe(1);
    });
  });
});
