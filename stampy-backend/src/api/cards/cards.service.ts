import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { Card } from "../../db/types";
import { GenericError } from "../../errors/generic";
import googleWalletSrv from "../wallet/wallet.service";

const PUBLIC_CODE_ATTEMPTS = 3;

export class CardsService {
  private publicCodeGenerator = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

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
