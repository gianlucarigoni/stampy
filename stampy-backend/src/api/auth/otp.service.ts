import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import crypto, { timingSafeEqual } from "crypto";
import { db } from "../../db";
import { DbOrTx } from "../../db/tx";
import { otpChallenges } from "../../db/schema";
import { env } from "../../config/env";
import { OtpChallenge } from "../../db/types";
import { OtpChannel } from "../../utils/types/enum";
import authEventsSrv from "./auth-events.service";

export const COOLDOWN_SECONDS = 45;
export const MAX_SENDS_PER_HOUR = 5;
export const OTP_TTL_MINUTES = 5;
export const MAX_OTP_ATTEMPTS = 5;
const HOUR_SECONDS = 3600;

export type CreateChallengeResult =
  | { ok: true; challenge: OtpChallenge; code: string }
  | { ok: false; reason: "cooldown" | "hourly_limit"; retryAfterSeconds: number };

export class OtpService {
  generateCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  // HMAC legato alla sfida: lo stesso codice in due sfide produce hash diversi
  hashCode(challengeId: string, code: string): string {
    return crypto.createHmac("sha256", env.OTP_HMAC_SECRET).update(`otp:${challengeId}:${code}`).digest("hex");
  }

  private isUniqueViolation(err: unknown): boolean {
    const e = err as { code?: string; cause?: { code?: string } };
    return e?.code === "23505" || e?.cause?.code === "23505";
  }

  /**
   * Controlla cooldown e tetto orario, chiude la sfida viva e ne crea una nuova,
   * tutto in una transazione. Non lancia errori di dominio: restituisce un risultato.
   */
  async createChallenge(channel: OtpChannel, destination: string): Promise<CreateChallengeResult> {
    try {
      return await db.transaction(async (tx) => {
        const inWindow = sql`${otpChallenges.createdAt} > now() - interval '1 hour'`;
        const [stats] = await tx
          .select({
            secondsSinceLast: sql<number | null>`extract(epoch from (now() - max(${otpChallenges.createdAt})))::float8`,
            total: sql<number>`(count(*) filter (where ${inWindow}))::int`,
            oldestAge: sql<
              number | null
            >`extract(epoch from (now() - min(${otpChallenges.createdAt}) filter (where ${inWindow})))::float8`,
          })
          .from(otpChallenges)
          .where(and(eq(otpChallenges.channel, channel), eq(otpChallenges.destination, destination)));

        // controlli PRIMA di toccare qualsiasi riga
        if (stats.secondsSinceLast !== null && stats.secondsSinceLast < COOLDOWN_SECONDS) {
          await authEventsSrv.log(
            "otp_send_blocked",
            { email: destination, provider: "email", metadata: { reason: "cooldown" } },
            tx,
          );
          return {
            ok: false,
            reason: "cooldown",
            retryAfterSeconds: Math.ceil(COOLDOWN_SECONDS - stats.secondsSinceLast),
          } as const;
        }

        if (stats.total >= MAX_SENDS_PER_HOUR) {
          await authEventsSrv.log(
            "otp_send_blocked",
            { email: destination, provider: "email", metadata: { reason: "hourly_limit" } },
            tx,
          );
          return {
            ok: false,
            reason: "hourly_limit",
            retryAfterSeconds: Math.max(1, Math.ceil(HOUR_SECONDS - (stats.oldestAge ?? 0))),
          } as const;
        }

        // chiude la sfida viva (anche se scaduta); 0 righe = nessuna viva, caso normale
        await this.invalidateLiveChallenge(channel, destination, tx);

        const id = crypto.randomUUID();
        const code = this.generateCode();

        const [challenge] = await tx
          .insert(otpChallenges)
          .values({
            id,
            channel,
            destination,
            codeHash: this.hashCode(id, code),
            expiresAt: sql`now() + make_interval(mins => ${OTP_TTL_MINUTES})`,
          })
          .returning();

        await authEventsSrv.log("otp_sent", { email: destination, provider: "email" }, tx);

        return { ok: true, challenge, code } as const;
      });
    } catch (err) {
      // due richieste simultanee: l'indice UNIQUE parziale fa fallire la seconda
      if (this.isUniqueViolation(err)) {
        return { ok: false, reason: "cooldown", retryAfterSeconds: COOLDOWN_SECONDS };
      }
      throw err;
    }
  }

  // Chiude la sfida viva di un destinatario (nuovo invio). Solo righe non consumate e non invalidate.
  private async invalidateLiveChallenge(channel: OtpChannel, destination: string, tx: DbOrTx): Promise<void> {
    await tx
      .update(otpChallenges)
      .set({ invalidatedAt: sql`now()` })
      .where(
        and(
          eq(otpChallenges.channel, channel),
          eq(otpChallenges.destination, destination),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.invalidatedAt),
        ),
      );
  }

  /**
   * Conta un tentativo in modo atomico. Restituisce la sfida (con attempts già incrementato)
   * oppure null se inesistente, usata, invalidata, scaduta o con i tentativi esauriti.
   * Va chiamata fuori da transazioni: il conteggio deve restare anche se il resto fallisce.
   */
  async registerAttempt(challengeId: string): Promise<OtpChallenge | null> {
    const [challenge] = await db
      .update(otpChallenges)
      .set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(
        and(
          eq(otpChallenges.id, challengeId),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.invalidatedAt),
          gt(otpChallenges.expiresAt, sql`now()`),
          lt(otpChallenges.attempts, MAX_OTP_ATTEMPTS),
        ),
      )
      .returning();

    return challenge ?? null;
  }

  checkCode(challengeId: string, code: string, storedHash: string): boolean {
    const candidate = Buffer.from(this.hashCode(challengeId, code), "hex");
    const stored = Buffer.from(storedHash, "hex");
    if (candidate.length !== stored.length) return false; // timingSafeEqual lancia se le lunghezze differiscono
    return timingSafeEqual(candidate, stored);
  }

  // Invalida solo se ancora viva: non riscrive mai una sfida già consumata o già chiusa.
  async invalidateChallenge(id: string, tx?: DbOrTx): Promise<boolean> {
    const conn = tx ?? db;
    const rows = await conn
      .update(otpChallenges)
      .set({ invalidatedAt: sql`now()` })
      .where(and(eq(otpChallenges.id, id), isNull(otpChallenges.consumedAt), isNull(otpChallenges.invalidatedAt)))
      .returning({ id: otpChallenges.id });

    return rows.length > 0;
  }

  // Consumo monouso: 0 righe = un'altra richiesta l'ha già usata (o è scaduta nel frattempo).
  async consumeChallenge(id: string, tx?: DbOrTx): Promise<OtpChallenge | null> {
    const conn = tx ?? db;
    const [consumed] = await conn
      .update(otpChallenges)
      .set({ consumedAt: sql`now()` })
      .where(
        and(
          eq(otpChallenges.id, id),
          isNull(otpChallenges.consumedAt),
          isNull(otpChallenges.invalidatedAt),
          gt(otpChallenges.expiresAt, sql`now()`),
        ),
      )
      .returning();

    return consumed ?? null;
  }
}

export default new OtpService();
