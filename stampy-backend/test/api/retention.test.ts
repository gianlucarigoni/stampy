/**
 * Retention (B4): `retentionSrv.purgeExpired()`.
 *
 * otp_challenges oltre 1 giorno, sessioni scadute/revocate da oltre 30 giorni,
 * auth_events oltre 12 mesi. Tocca il DB del worktree. Dati `retention-*@test.it`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import retentionSrv from "../../src/api/auth/retention/retention.service";
import authEventsSrv from "../../src/api/auth/auth-events/auth-events.service";
import { makeFixtures } from "../helpers/fixtures";
import { makeChallenge } from "../helpers/auth-db";

const fx = makeFixtures("retention");

afterAll(async () => {
  await fx.cleanup();
  await pool.end();
});

const exists = async (table: string, id: string) =>
  (await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id])).rowCount === 1;

describe("retentionSrv.purgeExpired", () => {
  describe("otp_challenges", () => {
    it("cancella quelle create oltre 1 giorno fa, conserva le recenti", async () => {
      const oldId = await makeChallenge(fx.email("otp-old"), "111111");
      const recentId = await makeChallenge(fx.email("otp-recent"), "222222");
      await pool.query(`UPDATE otp_challenges SET created_at = now() - interval '25 hours' WHERE id = $1`, [oldId]);
      await pool.query(`UPDATE otp_challenges SET created_at = now() - interval '23 hours' WHERE id = $1`, [recentId]);

      await retentionSrv.purgeExpired();

      expect(await exists("otp_challenges", oldId)).toBe(false);
      expect(await exists("otp_challenges", recentId)).toBe(true);
    });
  });

  describe("sessions", () => {
    it("cancella quelle scadute da oltre 30 giorni o revocate da oltre 30 giorni", async () => {
      const u = await fx.newUser("sess");
      const expiredOld = await fx.newSession(u.id, { expiresMinutesAgo: 31 * 24 * 60 });
      const revokedOld = await fx.newSession(u.id);
      await pool.query(`UPDATE sessions SET revoked_at = now() - interval '31 days' WHERE id = $1`, [revokedOld.sessionId]);

      await retentionSrv.purgeExpired();

      expect(await exists("sessions", expiredOld.sessionId)).toBe(false);
      expect(await exists("sessions", revokedOld.sessionId)).toBe(false);
    });

    it("conserva le sessioni vive e quelle scadute o revocate da meno di 30 giorni", async () => {
      const u = await fx.newUser("sess-keep");
      const live = await fx.newSession(u.id);
      const expiredRecent = await fx.newSession(u.id, { expiresMinutesAgo: 29 * 24 * 60 });
      const revokedRecent = await fx.newSession(u.id);
      await pool.query(`UPDATE sessions SET revoked_at = now() - interval '29 days' WHERE id = $1`, [revokedRecent.sessionId]);

      await retentionSrv.purgeExpired();

      expect(await exists("sessions", live.sessionId)).toBe(true);
      expect(await exists("sessions", expiredRecent.sessionId)).toBe(true);
      expect(await exists("sessions", revokedRecent.sessionId)).toBe(true);
    });
  });

  describe("auth_events", () => {
    it("cancella gli eventi oltre 12 mesi, conserva i più recenti", async () => {
      const hash = authEventsSrv.hashSubject(fx.email("ev"));
      const rows = (
        await pool.query(
          `INSERT INTO auth_events (type, provider, subject_hash, created_at) VALUES
             ('otp_sent', 'email', $1, now() - interval '13 months'),
             ('otp_sent', 'email', $1, now() - interval '11 months')
           RETURNING id`,
          [hash],
        )
      ).rows;

      await retentionSrv.purgeExpired();

      expect(await exists("auth_events", rows[0].id)).toBe(false);
      expect(await exists("auth_events", rows[1].id)).toBe(true);
    });
  });

  describe("cosa non tocca", () => {
    it("users, cards e stamp_requests restano anche con righe vecchie intorno", async () => {
      const venue = await fx.newVenue("keep");
      const u = await fx.newUser("keep");
      await fx.newSession(u.id, { expiresMinutesAgo: 40 * 24 * 60 });
      const promo = (await pool.query(`SELECT id FROM promotions WHERE venue_id = $1`, [venue])).rows[0].id;
      const card = (
        await pool.query(
          `INSERT INTO cards (user_id, venue_id, promotion_id, public_code, wallet_provider, wallet_object_id, created_at)
           VALUES ($1, $2, $3, 'RETKEEP1', 'google', $4, now() - interval '2 years') RETURNING id`,
          [u.id, venue, promo, `obj-ret-${Date.now()}`],
        )
      ).rows[0].id;
      const req = (
        await pool.query(
          `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at, created_at)
           VALUES ($1, $2, 'expired', now() - interval '2 years', now() - interval '2 years') RETURNING id`,
          [card, venue],
        )
      ).rows[0].id;

      await retentionSrv.purgeExpired();

      expect(await exists("users", u.id)).toBe(true);
      expect(await exists("cards", card)).toBe(true);
      expect(await exists("stamp_requests", req)).toBe(true);
    });
  });

  it("idempotente: la seconda esecuzione non cancella nulla e non dà errore", async () => {
    await makeChallenge(fx.email("idem"), "333333");
    await pool.query(`UPDATE otp_challenges SET created_at = now() - interval '3 days' WHERE destination = $1`, [fx.email("idem")]);

    const first = await retentionSrv.purgeExpired();
    const second = await retentionSrv.purgeExpired();

    expect(first.otpChallenges).toBeGreaterThanOrEqual(1);
    expect(second).toEqual({ otpChallenges: 0, sessions: 0, authEvents: 0 });
  });
});
