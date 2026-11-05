import crypto from "node:crypto";
import { pool } from "../../src/db";
import otpSrv from "../../src/api/auth/otp/otp.service";
import authEventsSrv from "../../src/api/auth/auth-events/auth-events.service";

/**
 * Helper DB per i test dell'autenticazione. Scrivono nel DB di sviluppo:
 * ogni file registra le email che usa con `track` e le ripulisce con `cleanupEmails` in afterAll.
 */
export const RUN = Date.now().toString(36);
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function makeEmailTracker(prefix: string) {
  const used: string[] = [];
  const email = (tag: string) => {
    const e = `${prefix}-${RUN}-${tag}@test.it`;
    used.push(e);
    return e;
  };
  return { email, used };
}

export type ChallengeOpts = { expiredSecondsAgo?: number; attempts?: number; invalidated?: boolean };

/** Crea una sfida OTP con un codice noto (stesso HMAC del server). Chiude quella viva dello stesso destinatario. */
export async function makeChallenge(email: string, code: string, o: ChallengeOpts = {}): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `UPDATE otp_challenges SET invalidated_at = now()
     WHERE destination = $1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
    [email],
  );
  const expires = o.expiredSecondsAgo
    ? `now() - make_interval(secs => ${Number(o.expiredSecondsAgo)})`
    : `now() + interval '5 minutes'`;
  await pool.query(
    `INSERT INTO otp_challenges (id, channel, destination, code_hash, attempts, expires_at, invalidated_at)
     VALUES ($1, 'email', $2, $3, $4, ${expires}, ${o.invalidated ? "now()" : "NULL"})`,
    [id, email, otpSrv.hashCode(id, code), o.attempts ?? 0],
  );
  return id;
}

export async function getChallenge(id: string) {
  const r = await pool.query(`SELECT attempts, consumed_at, invalidated_at FROM otp_challenges WHERE id = $1`, [id]);
  return r.rows[0];
}
export async function usersByEmail(email: string) {
  const r = await pool.query(`SELECT id, email, display_name FROM users WHERE email = $1`, [email]);
  return r.rows;
}
export async function identitiesOf(userId: string) {
  const r = await pool.query(
    `SELECT provider, provider_user_id, last_used_at FROM auth_identities WHERE user_id = $1`,
    [userId],
  );
  return r.rows;
}
export async function sessionsOf(userId: string) {
  const r = await pool.query(
    `SELECT token_hash, auth_provider, expires_at, user_agent FROM sessions WHERE user_id = $1`,
    [userId],
  );
  return r.rows;
}
export async function eventCountForEmail(email: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE subject_hash = $1 AND type = $2`, [
    authEventsSrv.hashSubject(email),
    type,
  ]);
  return r.rows[0].n;
}
export async function eventCountForUser(userId: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE user_id = $1 AND type = $2`, [
    userId,
    type,
  ]);
  return r.rows[0].n;
}

/** Elimina tutti i dati creati per le email indicate. */
export async function cleanupEmails(emails: string[]) {
  const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [emails])).rows.map((r) => r.id);
  await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM auth_events WHERE user_id = ANY($1) OR subject_hash = ANY($2)`, [
    ids,
    emails.map((e) => authEventsSrv.hashSubject(e)),
  ]);
  await pool.query(`DELETE FROM auth_identities WHERE user_id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM otp_challenges WHERE destination = ANY($1)`, [emails]);
}
