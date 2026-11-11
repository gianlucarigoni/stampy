import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { DbOrTx } from "../../../db/tx";
import { authIdentities, users } from "../../../db/schema";
import { classifyGoogleEmail } from "../google/google-email";
import type { GoogleClaims } from "../google/google-token.service";

type UserRow = typeof users.$inferSelect;

export type EmailLoginResult = {
  user: UserRow;
  created: boolean; // utente appena creato
  linked: boolean; // identità email aggiunta a un utente già esistente
};

// ok = si entra; rejected = email non garantita da Google (evento di rifiuto);
// refused = dato incoerente (utente anonimizzato, altra identità google): si rifiuta senza evento.
export type GoogleLoginResult =
  | { kind: "ok"; user: UserRow; created: boolean; linked: boolean }
  | { kind: "rejected" }
  | { kind: "refused" };

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

  /**
   * Utente + identità `google` dopo un ID token già verificato. Da chiamare dentro la transazione del login.
   *
   *  - `sub` già noto                              -> accesso all'utente collegato
   *  - `sub` nuovo, email non verificata           -> rejected
   *  - `sub` nuovo, email di un utente esistente   -> collegamento solo se l'email è autorevole (Gmail o `hd`),
   *                                                   altrimenti rejected
   *  - `sub` nuovo, email libera                   -> utente nuovo + identità (anche per email di terzi)
   */
  async loginWithGoogle(claims: GoogleClaims, tx: DbOrTx): Promise<GoogleLoginResult> {
    const findBySub = async () => {
      const [row] = await tx
        .select({ identityId: authIdentities.id, user: users })
        .from(authIdentities)
        .innerJoin(users, eq(users.id, authIdentities.userId))
        .where(and(eq(authIdentities.provider, "google"), eq(authIdentities.providerUserId, claims.sub)))
        .limit(1);
      return row;
    };
    const touch = (identityId: string) =>
      tx.update(authIdentities).set({ lastUsedAt: sql`now()` }).where(eq(authIdentities.id, identityId));

    // 1) sub già noto: l'identità è la chiave, l'email nel token può essere cambiata
    const known = await findBySub();
    if (known) {
      if (known.user.anonymizedAt) return { kind: "refused" };
      await touch(known.identityId);
      return { kind: "ok", user: known.user, created: false, linked: false };
    }

    // 2) sub nuovo: serve un'email che Google dichiara verificata
    const trust = classifyGoogleEmail(claims);
    if (trust === "non-verificata") return { kind: "rejected" };

    // 3) utente con quella email, oppure nuovo (INSERT ... ON CONFLICT DO NOTHING: niente 23505 dentro la transazione)
    const [inserted] = await tx
      .insert(users)
      .values({ email: claims.email })
      .onConflictDoNothing({ target: users.email })
      .returning();
    const user = inserted ?? (await tx.select().from(users).where(eq(users.email, claims.email)).limit(1))[0];
    if (!user || user.anonymizedAt) return { kind: "refused" };

    if (!inserted) {
      // una richiesta parallela con lo stesso sub può aver appena creato utente e identità
      const raced = await findBySub();
      if (raced && raced.user.id === user.id) {
        await touch(raced.identityId);
        return { kind: "ok", user, created: false, linked: false };
      }
      // utente esistente: collegamento automatico solo se Google garantisce l'indirizzo
      if (trust !== "autorevole") return { kind: "rejected" };
    }

    // 4) identità google; (user, google) è unico: un'altra identità google dello stesso utente è un'incoerenza
    const [identity] = await tx
      .insert(authIdentities)
      .values({ userId: user.id, provider: "google", providerUserId: claims.sub, emailAtProvider: claims.email })
      .onConflictDoNothing()
      .returning({ id: authIdentities.id });
    if (!identity) return { kind: "refused" };

    return { kind: "ok", user, created: !!inserted, linked: !inserted };
  }
}

export default new IdentityService();
