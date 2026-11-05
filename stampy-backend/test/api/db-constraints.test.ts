/**
 * Vincoli del DB scritti a mano o decisi nelle migrazioni 2 e 3 (non li genera Drizzle:
 * un `push` o un'`introspect` li cancellerebbe). Ogni caso gira in una transazione con
 * ROLLBACK: non lascia dati nel DB di sviluppo.
 */
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db";

let c: PoolClient;
beforeAll(async () => {
  c = await pool.connect();
});
beforeEach(() => c.query("BEGIN"));
afterEach(() => c.query("ROLLBACK"));
afterAll(async () => {
  c.release();
  await pool.end();
});

/** Esegue una query che deve fallire e restituisce il codice SQLSTATE. */
async function failCode(sql: string, params: unknown[] = []): Promise<string> {
  await c.query("SAVEPOINT s");
  try {
    await c.query(sql, params);
  } catch (e: any) {
    await c.query("ROLLBACK TO SAVEPOINT s");
    return e.code;
  }
  throw new Error("la query doveva fallire: " + sql);
}
const UNIQUE = "23505";
const CHECK = "23514";
const FK = "23503";

const user = async (email: string | null) =>
  (await c.query(`INSERT INTO users (email) VALUES ($1) RETURNING id`, [email])).rows[0].id as string;

describe("migrazione 2: utenti e identità", () => {
  it("rifiuta un'email duplicata", async () => {
    await user("a@test.it");
    expect(await failCode(`INSERT INTO users (email) VALUES ('a@test.it')`)).toBe(UNIQUE);
  });

  it("accetta più utenti senza email", async () => {
    await user(null);
    await user(null);
  });

  it.each([["Mario@Test.it"], [" c@test.it"]])("rifiuta l'email non normalizzata %j", async (e) => {
    expect(await failCode(`INSERT INTO users (email) VALUES ($1)`, [e])).toBe(CHECK);
  });

  it("rifiuta un'identità (provider, id) duplicata e una seconda identità email per lo stesso utente", async () => {
    const u1 = await user("a@test.it");
    const u2 = await user("b@test.it");
    await c.query(
      `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider) VALUES ($1,'email','a@test.it','a@test.it')`,
      [u1],
    );
    expect(
      await failCode(`INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES ($1,'email','a@test.it')`, [u2]),
    ).toBe(UNIQUE);
    expect(
      await failCode(`INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES ($1,'email','altra@test.it')`, [u1]),
    ).toBe(UNIQUE);
  });

  it("identità email con maiuscole rifiutata, sub Google con maiuscole accettato, email_at_provider con maiuscole rifiutata", async () => {
    const u = await user("b@test.it");
    expect(
      await failCode(`INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES ($1,'email','B@test.it')`, [u]),
    ).toBe(CHECK);
    await c.query(`INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES ($1,'google','AbC123')`, [u]);
    const u3 = await user(null);
    expect(
      await failCode(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider) VALUES ($1,'google','sub999','X@Test.it')`,
        [u3],
      ),
    ).toBe(CHECK);
  });

  it("non permette di cancellare un utente con identità (FK RESTRICT)", async () => {
    const u = await user("a@test.it");
    await c.query(`INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES ($1,'email','a@test.it')`, [u]);
    expect(await failCode(`DELETE FROM users WHERE id = $1`, [u])).toBe(FK);
  });

  it("non ha più le colonne phone_* e conserva promotions_no_overlap", async () => {
    const cols = await c.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'phone%'`,
    );
    expect(cols.rowCount).toBe(0);
    const ex = await c.query(`SELECT 1 FROM pg_constraint WHERE conname = 'promotions_no_overlap'`);
    expect(ex.rowCount).toBe(1);
  });
});

describe("migrazione 2: sfide OTP, sessioni, eventi", () => {
  const challenge = (dest: string, hash: string, attempts = 0) =>
    c.query(
      `INSERT INTO otp_challenges (channel, destination, code_hash, attempts, expires_at) VALUES ('email',$1,$2,$3, now() + interval '5 minutes')`,
      [dest, hash, attempts],
    );

  it("ammette una sola sfida attiva per destinatario, ma una nuova dopo l'invalidazione", async () => {
    await challenge("x@test.it", "h1");
    expect(await failCode(`INSERT INTO otp_challenges (channel, destination, code_hash, expires_at) VALUES ('email','x@test.it','h2', now() + interval '5 minutes')`)).toBe(UNIQUE);
    await c.query(`UPDATE otp_challenges SET invalidated_at = now() WHERE destination = 'x@test.it'`);
    await challenge("x@test.it", "h3");
  });

  it("rifiuta attempts negativi e destinatari con maiuscole", async () => {
    expect(await failCode(`INSERT INTO otp_challenges (channel, destination, code_hash, attempts, expires_at) VALUES ('email','y@test.it','h4',-1, now() + interval '5 minutes')`)).toBe(CHECK);
    expect(await failCode(`INSERT INTO otp_challenges (channel, destination, code_hash, expires_at) VALUES ('email','Y@test.it','h5', now() + interval '5 minutes')`)).toBe(CHECK);
  });

  it("rifiuta un token_hash di sessione duplicato", async () => {
    const u1 = await user("a@test.it");
    const u2 = await user("b@test.it");
    const ins = (u: string) =>
      c.query(`INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at) VALUES ($1,'hash1','email', now() + interval '1 day')`, [u]);
    await ins(u1);
    expect(await failCode(`INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at) VALUES ($1,'hash1','email', now() + interval '1 day')`, [u2])).toBe(UNIQUE);
  });

  it("accetta un evento con utente NULL e rifiuta uno con utente inesistente", async () => {
    await c.query(`INSERT INTO auth_events (user_id, type) VALUES (NULL, 'otp_failed')`);
    expect(await failCode(`INSERT INTO auth_events (user_id, type) VALUES (gen_random_uuid(), 'otp_failed')`)).toBe(FK);
  });
});

describe("migrazione 3: stamp_events.request_id non è univoco", () => {
  async function seed() {
    const u = await user("m3@test.it");
    const v = (await c.query(`INSERT INTO venues (name, slug) VALUES ('M3 Test','m3-test') RETURNING id`)).rows[0].id;
    const p = (
      await c.query(
        `INSERT INTO promotions (venue_id, type, name, config, starts_at)
         VALUES ($1,'stamps','M3','{"v":1,"stampsRequired":10,"reward":"Premio"}'::jsonb, now() - interval '1 day') RETURNING id`,
        [v],
      )
    ).rows[0].id;
    const card = (
      await c.query(
        `INSERT INTO cards (user_id, venue_id, promotion_id, public_code, wallet_provider, wallet_object_id)
         VALUES ($1,$2,$3,'M3CODE01','google','issuer.m3') RETURNING id`,
        [u, v, p],
      )
    ).rows[0].id;
    const r = (
      await c.query(`INSERT INTO stamp_requests (card_id, venue_id, expires_at) VALUES ($1,$2, now() + interval '3 minutes') RETURNING id`, [card, v])
    ).rows[0].id;
    const ev = (type: string, qty: number, req: string | null, key: string) =>
      c.query(
        `INSERT INTO stamp_events (card_id, venue_id, promotion_id, operator_id, request_id, type, quantity, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [card, v, p, u, req, type, qty, key],
      );
    return { r, ev };
  }

  it("non ha più il UNIQUE su request_id e mantiene l'indice e la FK composita", async () => {
    const uq = await c.query(`SELECT 1 FROM pg_constraint WHERE conname = 'stamp_events_request_id_unique'`);
    expect(uq.rowCount).toBe(0);
    const idx = await c.query(`SELECT 1 FROM pg_indexes WHERE tablename = 'stamp_events' AND indexname = 'stamp_events_request_idx'`);
    expect(idx.rowCount).toBe(1);
    const fk = await c.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'stamp_events_request_id_venue_id_stamp_requests_id_venue_id_fk'`,
    );
    expect(fk.rowCount).toBe(1);
  });

  it("accetta più eventi con lo stesso request_id, uno con request_id NULL, e rifiuta idempotency_key duplicata", async () => {
    const { r, ev } = await seed();
    await ev("stamp", 10, r, `${r}:1`);
    await ev("redeem", 1, r, `${r}:2`);
    await ev("stamp", 1, null, "m3-null-request");
    await c.query("SAVEPOINT s");
    await expect(ev("stamp", 1, r, `${r}:1`)).rejects.toMatchObject({ code: UNIQUE });
    await c.query("ROLLBACK TO SAVEPOINT s");
  });
});
