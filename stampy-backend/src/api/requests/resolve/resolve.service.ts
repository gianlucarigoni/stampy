import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, promotions, stampEvents, stampRequests } from "../../../db/schema";
import { DbOrTx } from "../../../db/tx";
import { RequestStatus } from "../../../db/types";
import { GenericError } from "../../../errors/generic";
import { RequestNotFoundError } from "../../../errors/request-not-found.error";
import { promotionConfigSchema } from "../../../utils/schemas/promotion-config.schema";
import { splitStamps } from "../../../utils/stamps";

export type ConfirmResult = {
  status: "approved";
  stampsCount: number; // saldo dopo la conferma
  stampsRequired: number; // soglia della promozione applicata
  rewards: number; // premi consumati in questa conferma (eventi `redeem`)
};

export type RejectResult = { status: "rejected" };

/**
 * Conferma e rifiuto di una richiesta di timbro (staff).
 *
 * Regole applicate (tutte decise):
 *  - lo staff digita quanti prodotti sono stati consumati (premio compreso); i tratti
 *    li ricalcola il backend con `splitStamps` (timbri fino alla soglia, 1 prodotto
 *    in premio che consuma una unità, poi i timbri rimanenti);
 *  - un solo vincitore per richiesta: la UPDATE condizionata su `status='pending'`
 *    è il mutex, chi perde prende 409 (niente doppio conteggio);
 *  - la promozione della card deve essere quella attiva, altrimenti 409;
 *  - gli eventi si scrivono con `idempotency_key = {requestId}:{n}`;
 *  - `cards.stamps_count` si aggiorna nella stessa transazione, con la riga lockata.
 */
export class ResolveService {
  /**
   * Scadenza lazy della singola richiesta, FUORI dalla transazione di conferma:
   * se la conferma fallisce, la richiesta scaduta resta comunque `expired`.
   * Solo da `pending` (mai sovrascrivere una richiesta già conclusa).
   */
  private async expireIfDue(venueId: string, requestId: string): Promise<void> {
    await db
      .update(stampRequests)
      .set({ status: RequestStatus.expired, resolvedAt: sql`now()` })
      .where(
        and(
          eq(stampRequests.id, requestId),
          eq(stampRequests.venueId, venueId),
          eq(stampRequests.status, RequestStatus.pending),
          lte(stampRequests.expiresAt, sql`now()`),
        ),
      );
  }

  /**
   * La UPDATE condizionata non ha trovato la richiesta: distinguiamo "non esiste
   * (o è di un altro locale)" da "esiste ma non è più pending". Il primo caso è 404
   * (stessa forma del polling), il secondo 409.
   */
  private async throwNotFoundOrConflict(conn: DbOrTx, venueId: string, requestId: string): Promise<never> {
    const [row] = await conn
      .select({ id: stampRequests.id })
      .from(stampRequests)
      .where(and(eq(stampRequests.id, requestId), eq(stampRequests.venueId, venueId)))
      .limit(1);

    if (!row) throw new RequestNotFoundError();
    throw new GenericError("Richiesta non più valida", 409);
  }

  async confirm(venueId: string, requestId: string, operatorId: string, stamps: number): Promise<ConfirmResult> {
    await this.expireIfDue(venueId, requestId);

    return db.transaction(async (tx) => {
      // 1) mutex: approvazione condizionata a pending + non scaduta
      const [request] = await tx
        .update(stampRequests)
        .set({ status: RequestStatus.approved, resolvedAt: sql`now()`, resolvedBy: operatorId })
        .where(
          and(
            eq(stampRequests.id, requestId),
            eq(stampRequests.venueId, venueId),
            eq(stampRequests.status, RequestStatus.pending),
            gt(stampRequests.expiresAt, sql`now()`),
          ),
        )
        .returning({ cardId: stampRequests.cardId });

      if (!request) return this.throwNotFoundOrConflict(tx, venueId, requestId);

      // 2) lock della card: serializza il calcolo del saldo con un eventuale altro scrittore
      const [card] = await tx
        .select()
        .from(cards)
        .where(and(eq(cards.id, request.cardId), eq(cards.venueId, venueId)))
        .for("update")
        .limit(1);

      // impossibile per la FK composita (card_id, venue_id) di stamp_requests
      if (!card) throw new RequestNotFoundError();

      // 3) la promozione della card deve essere quella attiva adesso (409, decisione chiusa)
      const [active] = await tx
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

      if (!active) throw new GenericError("Nessuna promozione attiva per questo locale", 409);
      if (card.promotionId !== active.id) {
        throw new GenericError("La promozione della card non è quella attiva", 409);
      }

      const { stampsRequired } = promotionConfigSchema.parse(active.config);
      const { segments, finalCount, rewards } = splitStamps(stampsRequired, card.stampsCount, stamps);

      // 4) un evento per tratto, chiave idempotente {requestId}:{n}
      await tx.insert(stampEvents).values(
        segments.map((segment, index) => ({
          cardId: card.id,
          venueId,
          promotionId: active.id,
          operatorId,
          requestId,
          type: segment.type,
          quantity: segment.quantity,
          idempotencyKey: `${requestId}:${index + 1}`,
        })),
      );

      // 5) saldo sulla card: la riga è lockata, nessun read-modify-write concorrente
      await tx.update(cards).set({ stampsCount: finalCount }).where(eq(cards.id, card.id));

      return { status: "approved" as const, stampsCount: finalCount, stampsRequired, rewards };
    });
  }

  async reject(venueId: string, requestId: string, operatorId: string): Promise<RejectResult> {
    await this.expireIfDue(venueId, requestId);

    const [updated] = await db
      .update(stampRequests)
      .set({ status: RequestStatus.rejected, resolvedAt: sql`now()`, resolvedBy: operatorId })
      .where(
        and(
          eq(stampRequests.id, requestId),
          eq(stampRequests.venueId, venueId),
          eq(stampRequests.status, RequestStatus.pending),
          gt(stampRequests.expiresAt, sql`now()`),
        ),
      )
      .returning({ id: stampRequests.id });

    if (!updated) return this.throwNotFoundOrConflict(db, venueId, requestId);

    return { status: "rejected" as const };
  }
}

export default new ResolveService();
