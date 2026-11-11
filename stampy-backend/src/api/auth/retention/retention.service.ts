import { lt, sql } from "drizzle-orm";
import { db } from "../../../db";
import { authEvents, otpChallenges, sessions } from "../../../db/schema";

// Retention (BACKLOG B4). Valori proposti dal progetto, da rivedere con il proprietario:
// - otp_challenges: contengono l'email in chiaro; cooldown e tetto orario guardano solo l'ultima ora
// - sessions: il tetto assoluto è 90 giorni, quindi questa soglia non tocca sessioni vive
// - auth_events: audit di sicurezza, non per sempre
export const OTP_RETENTION_DAYS = 1;
export const SESSION_RETENTION_DAYS = 30;
export const AUTH_EVENTS_RETENTION_MONTHS = 12;

export type PurgeResult = { otpChallenges: number; sessions: number; authEvents: number };

export class RetentionService {
  // Solo righe vecchie; tempo sempre dal DB (now()). Non tocca users, cards né stamp_*.
  async purgeExpired(): Promise<PurgeResult> {
    const otp = await db
      .delete(otpChallenges)
      .where(lt(otpChallenges.createdAt, sql`now() - make_interval(days => ${OTP_RETENTION_DAYS})`))
      .returning({ id: otpChallenges.id });

    // "finita" = scaduta oppure revocata, la data più vecchia delle due
    const ses = await db
      .delete(sessions)
      .where(
        lt(
          sql`LEAST(${sessions.expiresAt}, COALESCE(${sessions.revokedAt}, ${sessions.expiresAt}))`,
          sql`now() - make_interval(days => ${SESSION_RETENTION_DAYS})`,
        ),
      )
      .returning({ id: sessions.id });

    const ev = await db
      .delete(authEvents)
      .where(lt(authEvents.createdAt, sql`now() - make_interval(months => ${AUTH_EVENTS_RETENTION_MONTHS})`))
      .returning({ id: authEvents.id });

    return { otpChallenges: otp.length, sessions: ses.length, authEvents: ev.length };
  }
}

export default new RetentionService();
