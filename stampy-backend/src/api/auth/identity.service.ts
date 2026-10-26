import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { DbOrTx } from "../../db/tx";
import { authIdentities, users } from "../../db/schema";

type UserRow = typeof users.$inferSelect;

export type EmailLoginResult = {
  user: UserRow;
  created: boolean; // utente appena creato
  linked: boolean; // identità email aggiunta a un utente già esistente
};

export class IdentityService {
  /**
   * Utente + identità `email` dopo un codice OTP verificato (prova di possesso già avvenuta).
   * Da chiamare dentro la transazione del login: `tx` obbligatorio.
   *
   *  - utente nuovo                      -> crea utente + identità
   *  - utente esistente senza identità   -> aggiunge l'identità (linked)
   *  - utente esistente con identità     -> solo accesso
   *
   * Restituisce null se i dati sono incoerenti (utente anonimizzato, identità di un altro utente).
   * `email` deve essere già normalizzata (minuscola, trim).
   */
  async loginWithEmail(email: string, tx: DbOrTx): Promise<EmailLoginResult | null> {
    // 1) utente: INSERT ... ON CONFLICT DO NOTHING (niente 23505: dopo un errore la transazione sarebbe abortita)
    const [inserted] = await tx
      .insert(users)
      .values({ email })
      .onConflictDoNothing({ target: users.email })
      .returning();

    let user = inserted;
    if (!user) {
      // l'utente esiste già (o l'ha creato in questo istante un'altra richiesta)
      const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
      user = existing;
    }
    if (!user || user.anonymizedAt) return null;

    // 2) identità email: chiave (provider, provider_user_id) = (email, email normalizzata)
    const [identityInserted] = await tx
      .insert(authIdentities)
      .values({ userId: user.id, provider: "email", providerUserId: email, emailAtProvider: email })
      .onConflictDoNothing()
      .returning({ id: authIdentities.id });

    if (!identityInserted) {
      const [identity] = await tx
        .select({ id: authIdentities.id, userId: authIdentities.userId })
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, "email"), eq(authIdentities.providerUserId, email)))
        .limit(1);

      // l'identità esiste ma è di un altro utente: incoerenza, non si entra
      if (!identity || identity.userId !== user.id) return null;

      await tx
        .update(authIdentities)
        .set({ lastUsedAt: sql`now()` })
        .where(eq(authIdentities.id, identity.id));
    }

    return { user, created: !!inserted, linked: !!identityInserted && !inserted };
  }
}

export default new IdentityService();
