import { and, eq, exists, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, stampRequests } from "../../db/schema";
import { RequestStatus } from "../../utils/enum/request-status.enum";
import { StampRequest } from "../../utils/types/stamp-request.type";

export class RequestsService {
  /**
   * Ownership di una richiesta: l'unico legame tra richiesta e utente è la card.
   * (card_id, venue_id) è la FK verso cards; cards.user_id è il proprietario.
   */
  private ownedBy(userId: string) {
    return exists(
      db
        .select()
        .from(cards)
        .where(
          and(
            eq(cards.id, stampRequests.cardId),
            eq(cards.venueId, stampRequests.venueId),
            eq(cards.userId, userId),
          ),
        ),
    );
  }

  async refreshStatus(id: string, userId: string) {
    const [updated] = await db
      .update(stampRequests)
      .set({
        status: RequestStatus.expired,
        resolvedAt: sql`now()`,
      })
      .where(
        and(
          eq(stampRequests.id, id),
          eq(stampRequests.status, RequestStatus.pending),
          lte(stampRequests.expiresAt, sql`now()`),
          // difesa in profondità: una richiesta di un altro utente non viene mai scritta
          this.ownedBy(userId),
        ),
      )
      .returning();

    if (!updated) return null;
    return updated;
  }

  async getRequestById(id: string, userId: string): Promise<StampRequest | null> {
    const [row] = await db
      .select({ request: stampRequests })
      .from(stampRequests)
      .innerJoin(
        cards,
        and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)),
      )
      .where(and(eq(stampRequests.id, id), eq(cards.userId, userId)))
      .limit(1);

    const request = row?.request;
    if (!request) return null;
    return request;
  }

  async getPendingRequest(cardId: string): Promise<StampRequest | null> {
    const [request] = await db
      .select()
      .from(stampRequests)
      .where(and(eq(stampRequests.cardId, cardId), eq(stampRequests.status, RequestStatus.pending)))
      .limit(1);

    if (!request) return null;
    return request;
  }

  async expirePendingRequest(cardId: string) {
    await db
      .update(stampRequests)
      .set({
        status: RequestStatus.expired,
        resolvedAt: sql`now()`,
      })
      .where(
        and(
          eq(stampRequests.cardId, cardId),
          eq(stampRequests.status, RequestStatus.pending),
          lte(stampRequests.expiresAt, sql`now()`),
        ),
      );
  }

  async updateStatus(requestId: string, status: RequestStatus): Promise<StampRequest | null> {
    const [updated] = await db
      .update(stampRequests)
      .set({
        status: status,
      })
      .where(eq(stampRequests.id, requestId))
      .returning();

    if (!updated) return null;
    return updated;
  }

  async newRequest(cardId: string, venueId: string): Promise<StampRequest | null> {
    const [newRequest] = await db
      .insert(stampRequests)
      .values({
        cardId,
        venueId,
        status: RequestStatus.pending,
        createdAt: sql`now()`,
        expiresAt: sql`now() + interval '3 minutes'`,
      })
      .onConflictDoNothing({
        target: stampRequests.cardId,
        where: eq(stampRequests.status, RequestStatus.pending),
      })
      .returning();

    return newRequest ?? null;
  }
}

export default new RequestsService();
