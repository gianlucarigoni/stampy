import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db";
import { DbOrTx } from "../../../db/tx";
import { authEvents, authIdentities, sessions, users, venueMembers } from "../../../db/schema";
import authEventsSrv from "../auth-events/auth-events.service";

export class AccountService {
  /**
   * Chi gestisce un locale (owner/staff) o la piattaforma non può eliminare l'account dalla UX:
   * come gestirlo è una decisione aperta (BACKLOG B4b). Legge sempre dal DB, mai dalla sessione.
   */
  async isDeletionBlocked(userId: string, tx?: DbOrTx): Promise<boolean> {
    const conn = tx ?? db;
    const [member] = await conn
      .select({ one: sql<number>`1` })
      .from(venueMembers)
      .where(eq(venueMembers.userId, userId))
      .limit(1);
    if (member) return true;

    const [admin] = await conn
      .select({ one: sql<number>`1` })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isPlatformAdmin, true)))
      .limit(1);
    return !!admin;
  }

  /**
   * Anonimizza l'utente (GDPR): email e nome svuotati, identità cancellate, sessioni vive revocate,
   * `subject_hash` degli eventi dell'utente azzerato. Card, richieste, timbri e membership restano.
   * Va chiamata dentro la transazione del chiamante (`tx` obbligatorio): tutto o niente.
   * Restituisce false se l'utente non esiste o è già anonimizzato (idempotente).
   */
  async anonymizeUser(userId: string, tx: DbOrTx): Promise<boolean> {
    // filtro di stato nel WHERE: una seconda esecuzione non riscrive nulla
    const [current] = await tx
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.anonymizedAt)))
      .for("update");
    if (!current) return false;

    // l'hash si calcola PRIMA di svuotare l'email: serve a ritrovare anche gli eventi senza user_id
    if (current.email) {
      await tx
        .update(authEvents)
        .set({ subjectHash: null })
        .where(eq(authEvents.subjectHash, authEventsSrv.hashSubject(current.email)));
    }

    await tx.delete(authIdentities).where(eq(authIdentities.userId, userId));

    await tx
      .update(users)
      .set({ email: null, displayName: null, anonymizedAt: sql`now()` })
      .where(and(eq(users.id, userId), isNull(users.anonymizedAt)));

    const revoked = await tx
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ authProvider: sessions.authProvider });
    for (const s of revoked) {
      await authEventsSrv.log("session_revoked", { userId, provider: s.authProvider }, tx);
    }

    return true;
  }
}

export default new AccountService();
