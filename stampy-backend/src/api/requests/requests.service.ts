import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { stampRequests } from "../../db/schema";
import { RequestStatus } from "../../utils/enum/request-status.enum";
import { StampRequest } from "../../utils/types/stamp-request.type";

export class RequestsService {
  async refreshStatus(id: string) {
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
        ),
      )
      .returning();

    if (!updated) return null;
    return updated;
  }

  async getRequestById(id: string): Promise<StampRequest | null> {
    const [request] = await db.select().from(stampRequests).where(eq(stampRequests.id, id));
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
