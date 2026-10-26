import crypto from "crypto";
import { db } from "../../db";
import { DbOrTx } from "../../db/tx";
import { sessions } from "../../db/schema";
import { sql } from "drizzle-orm";

// Durata assoluta (decisione provvisoria: da confermare). Una sola costante, letta anche per il cookie.
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE_NAME = "sid";

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
        expiresAt: sql`now() + make_interval(days => ${SESSION_TTL_DAYS})`,
        userAgent,
      })
      .returning();

    return { token, session };
  }
}

export default new SessionService();
