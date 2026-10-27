import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { venueMembers, venues } from "../../db/schema";
import { MemberRole } from "../../utils/types/enum";

// Un venueId malformato non deve arrivare a Postgres (errore 22P02 -> 500):
// per il middleware equivale a "non sei membro", cioè 403.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Membership = { role: MemberRole };

export class MembershipService {
  /**
   * Ruolo dell'utente nel locale, letto SEMPRE dal DB (decisione: niente ruoli in
   * sessione o in `req.auth`). Restituisce null se non è membro, se il locale è
   * archiviato o se l'id non è un UUID.
   *
   * `userId` viene dalla sessione, `venueId` dal path: è solo un selettore, il
   * valore autorevole è la riga di `venue_members`.
   */
  async getMembership(userId: string, venueId: string): Promise<Membership | null> {
    if (!UUID_RE.test(venueId)) return null;

    const [row] = await db
      .select({ role: venueMembers.role })
      .from(venueMembers)
      .innerJoin(venues, eq(venues.id, venueMembers.venueId))
      .where(
        and(
          eq(venueMembers.userId, userId),
          eq(venueMembers.venueId, venueId),
          isNull(venues.archivedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  /** Locali (non archiviati) in cui l'utente è membro: serve al frontend staff. */
  async listVenuesOfUser(userId: string) {
    return db
      .select({
        venueId: venues.id,
        name: venues.name,
        slug: venues.slug,
        role: venueMembers.role,
      })
      .from(venueMembers)
      .innerJoin(venues, eq(venues.id, venueMembers.venueId))
      .where(and(eq(venueMembers.userId, userId), isNull(venues.archivedAt)))
      .orderBy(venues.name);
  }
}

export default new MembershipService();
