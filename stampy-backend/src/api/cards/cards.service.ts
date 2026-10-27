import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { Card } from "../../db/types";
import googleWalletSrv from "../wallet/google-wallet.service";

export class CardsService {
  private publicCodeGenerator = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

  async addOrGetCard(userId: string, venueId: string, promotionId: string): Promise<{ card: Card; created: boolean }> {
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
      .onConflictDoNothing({ target: [cards.userId, cards.venueId] })
      .returning();

    if (card) return { card, created: true };

    const [existingCard] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.venueId, venueId)))
      .limit(1);

    return { card: existingCard, created: false };
  }
}

export default new CardsService();
