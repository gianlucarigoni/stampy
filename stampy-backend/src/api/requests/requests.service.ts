import { and, asc, eq, exists, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, promotions, stampRequests } from "../../db/schema";
import { RequestStatus, StampRequest } from "../../db/types";
import { promotionConfigSchema } from "../../utils/schemas/promotion-config.schema";

/**
 * Tetto di richieste di timbro NUOVE per card in un'ora (decisione 27/10/2026).
 * Il conteggio si ricava da `stamp_requests` (nessuna tabella contatori).
 * Non è un cooldown: dopo un rifiuto o una scadenza il cliente deve poter rifare
 * subito il tocco (decisione di prodotto chiusa).
 */
export const MAX_VISIT_REQUESTS_PER_HOUR = 10;

export type QueueItem = {
  requestId: string;
  publicCode: string;
  stampsCount: number;
  stampsRequired: number;
  createdAt: Date;
  expiresAt: Date;
};

export type CardStateOfRequest = {
  status: StampRequest["status"];
  expiresAt: Date;
  stampsCount: number;
  stampsRequired: number;
};

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
          and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId), eq(cards.userId, userId)),
        ),
    );
  }

  /**
   * Scadenza lazy della singola richiesta. Restituisce true se ha scritto.
   * Solo da `pending`: mai sovrascrivere una richiesta già conclusa.
   */
  async refreshStatus(id: string, userId: string): Promise<boolean> {
    const updated = await db
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
      .returning({ id: stampRequests.id });

    return updated.length > 0;
  }

  /**
   * Polling del cliente: stato della richiesta + saldo della card.
   * L'ownership è in SQL (join su cards.user_id): la richiesta altrui è indistinguibile
   * da una inesistente. Il saldo serve al client nel momento in cui lo stato passa ad
   * `approved` (decisione 27/10/2026).
   */
  async getRequestByUserId(id: string, userId: string): Promise<CardStateOfRequest | null> {
    const [row] = await db
      .select({
        request: stampRequests,
        stampsCount: cards.stampsCount,
        config: promotions.config,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .innerJoin(promotions, and(eq(promotions.id, cards.promotionId), eq(promotions.venueId, cards.venueId)))
      .where(and(eq(stampRequests.id, id), eq(cards.userId, userId)))
      .limit(1);

    if (!row) return null;

    return {
      status: row.request.status,
      expiresAt: row.request.expiresAt,
      stampsCount: row.stampsCount,
      stampsRequired: promotionConfigSchema.parse(row.config).stampsRequired,
    };
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

  /**
   * Rate limit delle richieste NUOVE per card: conta le righe della card nell'ultima
   * ora (qualunque stato). Il valore è calcolato dal DB, non dall'orologio di Node.
   * `retryAfterSeconds` = quanto manca alla scadenza della più vecchia della finestra.
   */
  async checkCardRateLimit(cardId: string): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        oldestAgeSeconds: sql<number | null>`extract(epoch from (now() - min(${stampRequests.createdAt})))::float8`,
      })
      .from(stampRequests)
      .where(and(eq(stampRequests.cardId, cardId), sql`${stampRequests.createdAt} > now() - interval '1 hour'`));

    if (stats.total < MAX_VISIT_REQUESTS_PER_HOUR) return { allowed: true };

    const age = stats.oldestAgeSeconds ?? 0;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(3600 - age)) };
  }

  /**
   * Coda staff: scadenza lazy del locale, poi le pendenti in ordine di arrivo.
   * La scadenza si fa qui perché una richiesta senza polling resterebbe `pending`
   * per sempre (occupando coda e indice parziale `one_pending_uq`).
   */
  async getPendingQueue(venueId: string, limit = 50): Promise<QueueItem[]> {
    await db
      .update(stampRequests)
      .set({ status: RequestStatus.expired, resolvedAt: sql`now()` })
      .where(
        and(
          eq(stampRequests.venueId, venueId),
          eq(stampRequests.status, RequestStatus.pending),
          lte(stampRequests.expiresAt, sql`now()`),
        ),
      );

    const rows = await db
      .select({
        requestId: stampRequests.id,
        publicCode: cards.publicCode,
        stampsCount: cards.stampsCount,
        config: promotions.config,
        createdAt: stampRequests.createdAt,
        expiresAt: stampRequests.expiresAt,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .innerJoin(promotions, and(eq(promotions.id, cards.promotionId), eq(promotions.venueId, cards.venueId)))
      .where(and(eq(stampRequests.venueId, venueId), eq(stampRequests.status, RequestStatus.pending)))
      .orderBy(asc(stampRequests.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      requestId: row.requestId,
      publicCode: row.publicCode,
      stampsCount: row.stampsCount,
      stampsRequired: promotionConfigSchema.parse(row.config).stampsRequired,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    }));
  }
}

export default new RequestsService();
