import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { cards, promotions, venues } from "../../db/schema";
import { Card, Promotion, Venue } from "../../db/types";
import { GenericError } from "../../errors/generic";
import { brandingSchema } from "../../utils/schemas/branding.schema";
import googleWalletSrv from "../wallet/wallet.service";

const PUBLIC_CODE_ATTEMPTS = 3;

export class CardsService {
  private publicCodeGenerator = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

  async getCardById(cardId: string): Promise<Card | null> {
    const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
    if (!card) return null;
    return card;
  }

  /**
   * "Add to Google Wallet" was tapped: not_added -> active. It records the tap, not that the
   * pass is really in the wallet (that needs Google notifications, BACKLOG V1/B10).
   * Idempotent: an already active card is left alone. Returns false if the user has no card
   * for this venue (same answer for a missing card and for someone else's).
   */
  async markWalletAdded(userId: string, venueId: string): Promise<boolean> {
    await db
      .update(cards)
      .set({ walletStatus: "active" })
      .where(and(eq(cards.userId, userId), eq(cards.venueId, venueId), eq(cards.walletStatus, "not_added")));

    const [card] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.venueId, venueId)))
      .limit(1);
    return !!card;
  }

  /**
   * Le card dell'utente (una per locale), dalla più recente, con il locale e la promozione attiva
   * (`now()` del DB; null se il locale non ne ha). Scope `cards.user_id` in SQL; locali archiviati esclusi.
   */
  async getUserCards(userId: string): Promise<{ card: Card; venue: Venue; promotion: Promotion | null }[]> {
    const rows = await db
      .select({ card: cards, venue: venues, promotion: promotions })
      .from(cards)
      .innerJoin(venues, and(eq(venues.id, cards.venueId), isNull(venues.archivedAt)))
      .leftJoin(
        promotions,
        and(
          eq(promotions.venueId, cards.venueId),
          lte(promotions.startsAt, sql`now()`),
          or(isNull(promotions.endsAt), gt(promotions.endsAt, sql`now()`)),
        ),
      )
      .where(eq(cards.userId, userId))
      .orderBy(desc(cards.createdAt));

    return rows.map((r) => ({
      card: r.card,
      venue: { ...r.venue, branding: brandingSchema.parse(r.venue.branding) },
      promotion: r.promotion,
    }));
  }

  async addOrGetCard(userId: string, venueId: string, promotionId: string): Promise<{ card: Card; created: boolean }> {
    // ON CONFLICT senza target: copre sia (user_id, venue_id) già esistente sia una
    // collisione di public_code, senza 23505. Se non c'è una card esistente, il conflitto
    // era sul public_code e si riprova con un codice nuovo.
    for (let attempt = 0; attempt < PUBLIC_CODE_ATTEMPTS; attempt++) {
      const id = randomUUID();

      const [card] = await db
        .insert(cards)
        .values({
          id,
          userId,
          venueId,
          promotionId,
          publicCode: this.publicCodeGenerator(),
          walletProvider: "google",
          walletStatus: "not_added",
          walletObjectId: googleWalletSrv.buildObjectId(id),
        })
        .onConflictDoNothing()
        .returning();

      if (card) return { card, created: true };

      const [existingCard] = await db
        .select()
        .from(cards)
        .where(and(eq(cards.userId, userId), eq(cards.venueId, venueId)))
        .limit(1);

      if (existingCard) return { card: existingCard, created: false };
    }

    throw new GenericError("Impossibile generare il codice della card", 500);
  }
}

export default new CardsService();
