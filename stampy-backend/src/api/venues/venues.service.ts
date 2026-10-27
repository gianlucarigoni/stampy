import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { promotions, venues } from "../../db/schema";
import { Promotion, Venue } from "../../db/types";
import { brandingSchema } from "../../utils/schemas/branding.schema";

export class VenueService {
  async getVenueById(venueId: string): Promise<Venue | null> {
    const [row] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!row || row.archivedAt !== null) return null;

    return { ...row, branding: brandingSchema.parse(row.branding) };
  }

  async getActivePromotion(venueId: string): Promise<Promotion | null> {
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.venueId, venueId),
          lte(promotions.startsAt, sql`now()`),
          or(isNull(promotions.endsAt), gt(promotions.endsAt, sql`now()`)),
        ),
      )
      .limit(1);

    return promotion ?? null;
  }
}

export default new VenueService();
