import crypto from "crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { CookieOptions } from "express";
import { db } from "../../db";
import { DbOrTx } from "../../db/tx";
import { sessions, users } from "../../db/schema";
import { env } from "../../config/env";
import { AuthContext } from "../../utils/types/auth.type";

export const SESSION_COOKIE_NAME = "sid";

// Scelte nostre, non standard (documentate in docs/CONTEXT.md §5.4):
// - idle: la sessione dura 30 giorni dall'ultima attività (scorrimento, non a ogni richiesta)
// - tetto assoluto: mai oltre 90 giorni dalla creazione, qualunque sia l'attività
// - touch: last_seen_at/expires_at si riscrivono solo se l'ultimo tocco è più vecchio di 5 minuti
export const SESSION_IDLE_TTL_DAYS = 30;
export const SESSION_ABSOLUTE_TTL_DAYS = 90;
export const SESSION_TOUCH_MINUTES = 5;

// Token di 32 byte in base64url: 43 caratteri, senza padding.
export const SESSION_TOKEN_LENGTH = 43;

// Unica fonte per le opzioni del cookie: usata per scriverlo (login) e per rimuoverlo (logout).
// Il maxAge lo aggiunge il chiamante: la cancellazione richiede le stesse opzioni senza maxAge.
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax", // Strict romperebbe l'apertura da tag NFC/QR
    path: "/",
  };
}

type SessionRow = typeof sessions.$inferSelect;
type SessionProvider = (typeof sessions.$inferInsert)["authProvider"];

export class SessionService {
  // SHA-256 (hex): il token ha già 256 bit di entropia, non serve un hash lento
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Crea una sessione e restituisce il token IN CHIARO (solo per il cookie): nel DB va solo l'hash.
   * Da chiamare solo dopo una verifica riuscita.
   */
  async create(
    userId: string,
    authProvider: SessionProvider,
    userAgent: string | null,
    tx?: DbOrTx,
  ): Promise<{ token: string; session: SessionRow }> {
    const conn = tx ?? db;
    const token = crypto.randomBytes(32).toString("base64url");

    const [session] = await conn
      .insert(sessions)
      .values({
        userId,
        tokenHash: this.hashToken(token),
        authProvider,
        // alla creazione il tetto assoluto non può scattare: serve solo allo scorrimento
        expiresAt: sql`now() + make_interval(days => ${SESSION_IDLE_TTL_DAYS})`,
        userAgent,
      })
      .returning();

    return { token, session };
  }

  /**
   * Valida il token e restituisce utente + sessione, oppure null per QUALSIASI motivo
   * (assente, alterato, scaduto, revocato, utente anonimizzato, tetto assoluto superato):
   * il chiamante risponde con un unico 401 generico.
   *
   * Lo scorrimento avviene solo se l'ultimo tocco è più vecchio di SESSION_TOUCH_MINUTES;
   * la decisione la prende il DB (`needs_touch`), non l'orologio di Node.
   */
  async authenticate(token: string): Promise<AuthContext | null> {
    const [row] = await db
      .select({
        sessionId: sessions.id,
        authProvider: sessions.authProvider,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        isPlatformAdmin: users.isPlatformAdmin,
        needsTouch: sql<boolean>`${sessions.lastSeenAt} < now() - make_interval(mins => ${SESSION_TOUCH_MINUTES})`,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`now()`),
          // tetto assoluto: esplicito, protegge anche sessioni create prima di questa modifica
          gt(sessions.createdAt, sql`now() - make_interval(days => ${SESSION_ABSOLUTE_TTL_DAYS})`),
          isNull(users.anonymizedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    if (row.needsTouch) await this.touch(row.sessionId);

    return {
      user: {
        id: row.userId,
        email: row.email,
        displayName: row.displayName,
        isPlatformAdmin: row.isPlatformAdmin,
      },
      session: { id: row.sessionId, authProvider: row.authProvider },
    };
  }

  // Scorrimento condizionato: solo sessioni ancora vive. Il tetto assoluto è calcolato da created_at.
  private async touch(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        lastSeenAt: sql`now()`,
        expiresAt: sql`LEAST(now() + make_interval(days => ${SESSION_IDLE_TTL_DAYS}), ${sessions.createdAt} + make_interval(days => ${SESSION_ABSOLUTE_TTL_DAYS}))`,
      })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)));
  }

  // Revoca solo se ancora viva: 0 righe = già revocata (nessun secondo evento di audit).
  async revoke(sessionId: string, tx?: DbOrTx): Promise<boolean> {
    const conn = tx ?? db;
    const rows = await conn
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });

    return rows.length > 0;
  }
}

export default new SessionService();
