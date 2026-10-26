import crypto from "crypto";
import { db } from "../../db";
import { DbOrTx } from "../../db/tx";
import { authEvents } from "../../db/schema";
import { env } from "../../config/env";
import { AuthEventType } from "../../utils/types/enum";

type EventProvider = NonNullable<(typeof authEvents.$inferInsert)["provider"]>;

export type LogEventData = {
  email?: string; // mai salvata in chiaro: finisce in subject_hash
  userId?: string; // NULL = utente sconosciuto
  provider?: EventProvider;
  metadata?: object; // mai email, codici o dati personali
};

export class AuthEventsService {
  // pseudonimo dell'email per correlare i tentativi senza salvarla
  hashSubject(email: string): string {
    return crypto.createHmac("sha256", env.OTP_HMAC_SECRET).update(`subject:${email}`).digest("hex");
  }

  // Append-only: solo INSERT. Con `tx` l'evento entra nella transazione del chiamante.
  async log(type: AuthEventType, data: LogEventData = {}, tx?: DbOrTx): Promise<void> {
    const conn = tx ?? db;
    await conn.insert(authEvents).values({
      type,
      userId: data.userId,
      provider: data.provider,
      subjectHash: data.email ? this.hashSubject(data.email) : undefined,
      metadata: data.metadata ?? {},
    });
  }
}

export default new AuthEventsService();
