import { eq } from "drizzle-orm";
import { db } from "../../db";
import { venues } from "../../db/schema";
import { VenueNotFoundError } from "../../errors/venue-not-found.error";

/** Dati pubblici (non autenticati): solo ciò che serve alla pagina di login. */
export class PublicService {
  /** Solo il nome. Locale inesistente → `VenueNotFoundError` (stesso 404 del formato non valido). */
  async venueName(venueId: string): Promise<string> {
    const [row] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!row) throw new VenueNotFoundError();
    return row.name;
  }
}

export default new PublicService();
