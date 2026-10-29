import crypto from "crypto";
import { z } from "zod";
import { db } from "../../../db";
import { DbOrTx } from "../../../db/tx";
import { authEvents } from "../../../db/schema";
import { env } from "../../../config/env";
import { AuthEventType } from "../../../db/types";

type EventProvider = NonNullable<(typeof authEvents.$inferInsert)["provider"]>;

export type LogEventData = {
  email?: string; // mai salvata in chiaro: finisce in subject_hash
  userId?: string; // NULL = utente sconosciuto
  provider?: EventProvider;
  metadata?: object; // mai email, codici o dati personali
};

// Whitelist dei metadata per tipo di evento: niente IP, niente dominio dell'email,
// mai email né codici. `.strict()` rifiuta qualsiasi chiave non prevista.
const noMetadata = z.strictObject({});

const metadataSchemas: Record<AuthEventType, z.ZodType> = {
  otp_sent: noMetadata,
  otp_send_blocked: z.strictObject({ reason: z.enum(["cooldown", "hourly_limit"]) }),
  otp_failed: z.strictObject({ attempts: z.number().int().min(0) }),
  otp_verified: noMetadata,
  login_success: noMetadata,
  identity_linked: noMetadata,
  google_untrusted_email_rejected: noMetadata,
  logout: noMetadata,
  session_revoked: noMetadata,
};

export class AuthEventsService {
  // pseudonimo dell'email per correlare i tentativi senza salvarla
  hashSubject(email: string): string {
    return crypto.createHmac("sha256", env.OTP_HMAC_SECRET).update(`subject:${email}`).digest("hex");
  }

  // Append-only: solo INSERT. Con `tx` l'evento entra nella transazione del chiamante.
  async log(type: AuthEventType, data: LogEventData = {}, tx?: DbOrTx): Promise<void> {
    const conn = tx ?? db;
    // Un metadata fuori whitelist è un bug di programmazione: meglio un errore che un dato personale a DB.
    const metadata = metadataSchemas[type].parse(data.metadata ?? {});

    await conn.insert(authEvents).values({
      type,
      userId: data.userId,
      provider: data.provider,
      subjectHash: data.email ? this.hashSubject(data.email) : undefined,
      metadata,
    });
  }
}

export default new AuthEventsService();
