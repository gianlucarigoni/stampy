/**
 * Anonimizzazione di un utente (B4): `accountSrv.anonymizeUser(userId, tx)`.
 *
 * Tocca il DB del worktree. Dati `account-anon-*@test.it`, eliminati in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "../../src/db";
import accountSrv from "../../src/api/auth/account/account.service";
import authEventsSrv from "../../src/api/auth/auth-events/auth-events.service";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("account-anon");
let venue: string;
let operatorId: string;

const userRow = async (id: string) =>
  (await pool.query(`SELECT email, display_name, anonymized_at FROM users WHERE id = $1`, [id])).rows[0];
const count = async (sql: string, params: unknown[]) => (await pool.query(sql, params)).rows[0].n as number;

async function addIdentity(userId: string, email: string) {
  await pool.query(
    `INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider) VALUES ($1, 'email', $2, $2)`,
    [userId, email],
  );
}

/** Card + richiesta approvata + evento timbro per l'utente, nel locale di prova. */
async function addCardWithHistory(userId: string, tag: string) {
  const promo = (await pool.query(`SELECT id FROM promotions WHERE venue_id = $1`, [venue])).rows[0].id as string;
  const card = (
    await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id)
       VALUES ($1, $2, $3, 3, $4, 'google', $5) RETURNING id`,
      [userId, venue, promo, `T${tag}`.slice(0, 8).toUpperCase().padEnd(8, "X"), `obj-${tag}-${Date.now()}`],
    )
  ).rows[0].id as string;
  const req = (
    await pool.query(
      `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at, resolved_at, resolved_by)
       VALUES ($1, $2, 'approved', now() + interval '1 day', now(), $3) RETURNING id`,
      [card, venue, operatorId],
    )
  ).rows[0].id as string;
  await pool.query(
    `INSERT INTO stamp_events (card_id, venue_id, promotion_id, operator_id, request_id, type, quantity, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, 'stamp', 3, $6)`,
    [card, venue, promo, operatorId, req, `${req}:0`],
  );
  return { card, req };
}

const anonymize = (userId: string) => db.transaction((tx) => accountSrv.anonymizeUser(userId, tx));

beforeAll(async () => {
  venue = await fx.newVenue("a");
  operatorId = (await fx.newUser("operator")).id;
});
afterAll(async () => {
  await fx.cleanup();
  await pool.end();
});

describe("accountSrv.anonymizeUser", () => {
  describe("dati personali", () => {
    it("azzera email e nome e imposta anonymized_at; restituisce true", async () => {
      const u = await fx.newUser("basic", { displayName: "Mario Rossi" });

      expect(await anonymize(u.id)).toBe(true);

      const row = await userRow(u.id);
      expect(row.email).toBeNull();
      expect(row.display_name).toBeNull();
      expect(row.anonymized_at).not.toBeNull();
    });

    it("cancella le auth_identities dell'utente e non quelle di altri", async () => {
      const u = await fx.newUser("ident");
      const other = await fx.newUser("ident-other");
      await addIdentity(u.id, u.email);
      await addIdentity(other.id, other.email);

      await anonymize(u.id);

      expect(await count(`SELECT count(*)::int AS n FROM auth_identities WHERE user_id = $1`, [u.id])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM auth_identities WHERE user_id = $1`, [other.id])).toBe(1);
    });
  });

  describe("sessioni", () => {
    it("revoca le sessioni vive; quella già revocata mantiene il suo revoked_at", async () => {
      const u = await fx.newUser("sess");
      const live = await fx.newSession(u.id);
      const live2 = await fx.newSession(u.id);
      const old = await fx.newSession(u.id, { revoked: true });
      await pool.query(`UPDATE sessions SET revoked_at = now() - interval '2 days' WHERE id = $1`, [old.sessionId]);
      const before = (await pool.query(`SELECT revoked_at FROM sessions WHERE id = $1`, [old.sessionId])).rows[0].revoked_at;

      await anonymize(u.id);

      const rows = (await pool.query(`SELECT id, revoked_at FROM sessions WHERE user_id = $1`, [u.id])).rows;
      const byId = Object.fromEntries(rows.map((r) => [r.id, r.revoked_at]));
      expect(byId[live.sessionId]).not.toBeNull();
      expect(byId[live2.sessionId]).not.toBeNull();
      expect(byId[old.sessionId]).toEqual(before);
    });

    it("scrive un evento session_revoked per ogni sessione viva revocata, senza hash dell'email", async () => {
      const u = await fx.newUser("sess-ev");
      await fx.newSession(u.id);
      await fx.newSession(u.id);
      await fx.newSession(u.id, { revoked: true });

      await anonymize(u.id);

      const ev = (await pool.query(`SELECT subject_hash FROM auth_events WHERE user_id = $1 AND type = 'session_revoked'`, [u.id])).rows;
      expect(ev).toHaveLength(2);
      expect(ev.every((e) => e.subject_hash === null)).toBe(true);
    });
  });

  describe("dati che restano", () => {
    it("lascia intatte card, richieste, timbri e venue_members", async () => {
      const u = await fx.newUser("keep");
      await fx.addMember(u.id, venue, "staff");
      const { card, req } = await addCardWithHistory(u.id, "keep");

      await anonymize(u.id);

      expect((await pool.query(`SELECT user_id, stamps_count FROM cards WHERE id = $1`, [card])).rows[0]).toEqual({
        user_id: u.id,
        stamps_count: 3,
      });
      expect((await pool.query(`SELECT status FROM stamp_requests WHERE id = $1`, [req])).rows[0].status).toBe("approved");
      expect(await count(`SELECT count(*)::int AS n FROM stamp_events WHERE request_id = $1`, [req])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM venue_members WHERE user_id = $1`, [u.id])).toBe(1);
    });
  });

  describe("subject_hash in auth_events", () => {
    it("azzera quello degli eventi dell'utente e di quelli senza user_id con lo stesso hash, non di altri utenti", async () => {
      const u = await fx.newUser("hash");
      const other = await fx.newUser("hash-other");
      const hashU = authEventsSrv.hashSubject(u.email);
      const hashOther = authEventsSrv.hashSubject(other.email);
      await pool.query(
        `INSERT INTO auth_events (user_id, type, provider, subject_hash) VALUES
           ($1, 'login_success', 'email', $2),
           (NULL, 'otp_sent', 'email', $2),
           ($3, 'login_success', 'email', $4)`,
        [u.id, hashU, other.id, hashOther],
      );

      await anonymize(u.id);

      expect(await count(`SELECT count(*)::int AS n FROM auth_events WHERE subject_hash = $1`, [hashU])).toBe(0);
      // le righe restano (append-only: cambia solo l'hash), l'evento dell'utente tiene il suo user_id
      expect(await count(`SELECT count(*)::int AS n FROM auth_events WHERE user_id = $1 AND type = 'login_success'`, [u.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM auth_events WHERE subject_hash = $1`, [hashOther])).toBe(1);
    });
  });

  describe("idempotenza e atomicità", () => {
    it("seconda esecuzione: false, nessun errore, anonymized_at invariato", async () => {
      const u = await fx.newUser("idem");
      expect(await anonymize(u.id)).toBe(true);
      const first = (await userRow(u.id)).anonymized_at;

      expect(await anonymize(u.id)).toBe(false);
      expect((await userRow(u.id)).anonymized_at).toEqual(first);
    });

    it("utente inesistente: false e nessuna scrittura", async () => {
      expect(await anonymize("00000000-0000-4000-8000-000000000000")).toBe(false);
    });

    it("tutto o niente: se la transazione del chiamante fallisce dopo, non cambia nulla", async () => {
      const u = await fx.newUser("atomic", { displayName: "Resta Qui" });
      await addIdentity(u.id, u.email);
      await fx.newSession(u.id);

      await expect(
        db.transaction(async (tx) => {
          await accountSrv.anonymizeUser(u.id, tx);
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");

      expect((await userRow(u.id)).email).toBe(u.email);
      expect(await count(`SELECT count(*)::int AS n FROM auth_identities WHERE user_id = $1`, [u.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM sessions WHERE user_id = $1 AND revoked_at IS NULL`, [u.id])).toBe(1);
    });
  });
});
