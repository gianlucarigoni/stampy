import crypto from "node:crypto";
import { pool } from "../../src/db";
import sessionSrv from "../../src/api/auth/session/session.service";
import authEventsSrv from "../../src/api/auth/auth-events/auth-events.service";

/**
 * Fixture per i test `api/`: utenti, sessioni, locali e promozioni creati direttamente nel DB
 * di sviluppo. Ogni file crea un `Fixtures` con un prefisso e chiama `cleanup()` in afterAll:
 * elimina SOLO ciò che ha creato lui (email `<prefisso>-<run>-<tag>@test.it`, slug `<prefisso>-<run>-<tag>`).
 */
export const RUN = Date.now().toString(36);

export type SessionOpts = {
  createdDaysAgo?: number;
  lastSeenMinutesAgo?: number;
  expiresInDays?: number;
  expiresMinutesAgo?: number;
  revoked?: boolean;
};

export function makeFixtures(prefix: string) {
  const emails: string[] = [];
  const venueIds: string[] = [];
  const promotionIds: string[] = [];

  const email = (tag: string) => {
    const e = `${prefix}-${RUN}-${tag}@test.it`;
    emails.push(e);
    return e;
  };

  async function newUser(tag: string, o: { displayName?: string; anonymized?: boolean } = {}) {
    const e = email(tag);
    const r = await pool.query(
      `INSERT INTO users (email, display_name, anonymized_at) VALUES ($1, $2, $3) RETURNING id`,
      [e, o.displayName ?? "Test Utente", o.anonymized ? new Date() : null],
    );
    return { id: r.rows[0].id as string, email: e };
  }

  async function newSession(userId: string, o: SessionOpts = {}) {
    const token = crypto.randomBytes(32).toString("base64url");
    const created = o.createdDaysAgo ? `now() - make_interval(days => ${o.createdDaysAgo})` : "now()";
    const lastSeen = o.lastSeenMinutesAgo ? `now() - make_interval(mins => ${o.lastSeenMinutesAgo})` : "now()";
    const expires = o.expiresMinutesAgo
      ? `now() - make_interval(mins => ${o.expiresMinutesAgo})`
      : `now() + make_interval(days => ${o.expiresInDays ?? 30})`;
    const r = await pool.query(
      `INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at, last_seen_at, created_at, user_agent)
       VALUES ($1, $2, 'email', ${expires}, ${lastSeen}, ${created}, 'test')
       RETURNING id`,
      [userId, sessionSrv.hashToken(token)],
    );
    const sessionId: string = r.rows[0].id;
    if (o.revoked) await pool.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [sessionId]);
    return { token, sessionId };
  }

  /** Utente + sessione valida in un colpo solo. */
  async function newUserWithSession(tag: string, o: { anonymized?: boolean } = {}) {
    const u = await newUser(tag, o);
    const s = await newSession(u.id);
    return { ...u, token: s.token, sessionId: s.sessionId };
  }

  async function addMember(userId: string, venueId: string, role: "owner" | "staff") {
    await pool.query(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ($1, $2, $3)`, [
      userId,
      venueId,
      role,
    ]);
  }

  /** Locale con branding valido e una promozione "timbri" attiva. */
  async function newVenue(tag: string, o: { stampsRequired?: number; reward?: string } = {}) {
    const slug = `${prefix}-${RUN}-${tag}`;
    const branding = { v: 1, logoUrl: "https://placehold.co/512x512.png", backgroundColor: "#AA0000" };
    const v = await pool.query(`INSERT INTO venues (name, slug, branding) VALUES ($1, $2, $3) RETURNING id`, [
      `Test ${tag}`,
      slug,
      JSON.stringify(branding),
    ]);
    const venueId: string = v.rows[0].id;
    venueIds.push(venueId);
    const config = { v: 1, stampsRequired: o.stampsRequired ?? 10, reward: o.reward ?? "Caffè gratis" };
    const p = await pool.query(
      `INSERT INTO promotions (venue_id, type, name, config, starts_at)
       VALUES ($1, 'stamps', 'Test', $2::jsonb, now() - interval '1 day') RETURNING id`,
      [venueId, JSON.stringify(config)],
    );
    promotionIds.push(p.rows[0].id);
    return venueId;
  }

  /** Promozione chiusa nel passato (per il caso "card su promozione vecchia"). */
  async function newOldPromotion(venueId: string) {
    const p = await pool.query(
      `INSERT INTO promotions (venue_id, type, name, config, starts_at, ends_at)
       VALUES ($1, 'stamps', 'Vecchia promozione', $2::jsonb, now() - interval '90 days', now() - interval '60 days')
       RETURNING id`,
      [venueId, JSON.stringify({ v: 1, stampsRequired: 10, reward: "Premio vecchio" })],
    );
    promotionIds.push(p.rows[0].id);
    return p.rows[0].id as string;
  }

  async function cleanup() {
    if (venueIds.length) {
      await pool.query(`DELETE FROM stamp_events WHERE venue_id = ANY($1)`, [venueIds]);
      await pool.query(`DELETE FROM stamp_requests WHERE venue_id = ANY($1)`, [venueIds]);
      await pool.query(`DELETE FROM cards WHERE venue_id = ANY($1)`, [venueIds]);
      await pool.query(`DELETE FROM venue_members WHERE venue_id = ANY($1)`, [venueIds]);
    }
    const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [emails])).rows.map((r) => r.id);
    if (ids.length) {
      await pool.query(`DELETE FROM stamp_events WHERE operator_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM venue_members WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
    }
    await pool.query(`DELETE FROM auth_events WHERE user_id = ANY($1) OR subject_hash = ANY($2)`, [
      ids,
      emails.map((e) => authEventsSrv.hashSubject(e)),
    ]);
    if (ids.length) {
      await pool.query(`DELETE FROM stamp_requests WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1))`, [ids]);
      await pool.query(`DELETE FROM cards WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM auth_identities WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    }
    await pool.query(`DELETE FROM otp_challenges WHERE destination = ANY($1)`, [emails]);
    if (promotionIds.length) await pool.query(`DELETE FROM promotions WHERE id = ANY($1)`, [promotionIds]);
    if (venueIds.length) await pool.query(`DELETE FROM venues WHERE id = ANY($1)`, [venueIds]);
  }

  return { email, emails, newUser, newSession, newUserWithSession, addMember, newVenue, newOldPromotion, cleanup };
}
