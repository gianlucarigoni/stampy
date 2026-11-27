import { SQL, and, asc, desc, eq, exists, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, promotions, stampEvents, stampRequests, users, venues } from "../../db/schema";
import { RequestStatus, StampRequest } from "../../db/types";
import { promotionConfigSchema } from "../../utils/schemas/promotion-config.schema";
import { VenueNotFoundError } from "../../errors/venue-not-found.error";
import { HISTORY_DEFAULT_LIMIT } from "../venues/staff/staff.dto";
import { Cursor, decodeCursor, encodeCursor } from "./history/cursor";
import venueSrv from "../venues/venues.service";

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
  // nome del cliente (mai l'email); null se anonimizzato o mai impostato
  displayName: string | null;
  stampsCount: number;
  stampsRequired: number;
  // la card è ferma su una promozione che non è più quella attiva: alla conferma riparte da 0
  promotionChanged: boolean;
  createdAt: Date;
  expiresAt: Date;
};

/** Chi chiede lo storico: tutte le richieste di un locale (staff) o tutte quelle di un cliente. */
export type HistoryScope = { venueId: string } | { userId: string };

export type HistoryFilters = {
  status?: RequestStatus;
  minStamps?: number;
  maxStamps?: number;
  from?: string;
  to?: string;
  // pagina (B19): righe per pagina (default 25) e cursore opaco di una pagina precedente
  limit?: number;
  cursor?: string;
  // solo cliente (B34): un locale in cui ha una card; altrimenti `VenueNotFoundError`
  venueId?: string;
};

export type HistoryItem = {
  requestId: string;
  publicCode: string;
  venueName: string;
  // nome del cliente (mai l'email); null se anonimizzato o mai impostato
  displayName: string | null;
  status: RequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  // timbri confermati (premio compreso); null se la richiesta non è `approved`
  stamps: number | null;
  stampsAdded: number | null;
  rewardsRedeemed: number | null;
  // nome del premio consumato (promozione dell'evento `redeem`); null se non `approved` o senza premio
  reward: string | null;
};

export type HistoryPage = {
  items: HistoryItem[];
  total: number; // righe che soddisfano scope e filtri
  pageStart: number; // posizione 1-based della prima riga della pagina (0 se vuota)
  pageEnd: number;
  prevCursor: string | null; // null sulla prima pagina
  nextCursor: string | null; // null sull'ultima
};

export type CardStateOfRequest = {
  status: StampRequest["status"];
  publicCode: string;
  expiresAt: Date;
  stampsCount: number;
  stampsRequired: number;
  venueName: string;
  // nome del premio della promozione mostrata (quella attiva se `promotionChanged`)
  rewardName: string;
  // la card è ferma su una promozione non più attiva (mai per `approved`): stampsCount/stampsRequired sono già quelli della nuova
  promotionChanged: boolean;
  // solo per `approved`: cosa ha registrato la conferma (null negli altri stati)
  outcome: { stampsAdded: number; rewardsRedeemed: number; reward: string } | null;
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
        publicCode: cards.publicCode,
        cardPromotionId: cards.promotionId,
        config: promotions.config,
        venueName: venues.name,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .innerJoin(venues, eq(venues.id, cards.venueId))
      .innerJoin(promotions, and(eq(promotions.id, cards.promotionId), eq(promotions.venueId, cards.venueId)))
      .where(and(eq(stampRequests.id, id), eq(cards.userId, userId)))
      .limit(1);

    if (!row) return null;

    // Promozione cambiata (rollover lazy alla conferma): finché la card non viene aggiornata si
    // mostra lo stato che avrà, cioè 0 timbri sulla promozione attiva. Mai per `approved`.
    const active = row.request.status === RequestStatus.approved ? null : await venueSrv.getActivePromotion(row.request.venueId);
    const promotionChanged = active !== null && active.id !== row.cardPromotionId;
    const config = promotionConfigSchema.parse(promotionChanged ? active.config : row.config);

    // Esito della conferma, letto dagli eventi scritti da `splitStamps` (nessun ricalcolo):
    // timbri aggiunti = somma dei tratti `stamp`, premi consumati = eventi `redeem`.
    let outcome: CardStateOfRequest["outcome"] = null;
    if (row.request.status === RequestStatus.approved) {
      const [events] = await db
        .select({
          stampsAdded: sql<number>`coalesce(sum(${stampEvents.quantity}) filter (where ${eq(stampEvents.type, "stamp")}), 0)::int`,
          rewardsRedeemed: sql<number>`count(*) filter (where ${eq(stampEvents.type, "redeem")})::int`,
        })
        .from(stampEvents)
        .where(and(eq(stampEvents.requestId, id), eq(stampEvents.venueId, row.request.venueId)));
      outcome = {
        stampsAdded: events?.stampsAdded ?? 0,
        rewardsRedeemed: events?.rewardsRedeemed ?? 0,
        reward: config.reward,
      };
    }

    return {
      status: row.request.status,
      publicCode: row.publicCode,
      expiresAt: row.request.expiresAt,
      stampsCount: promotionChanged ? 0 : row.stampsCount,
      stampsRequired: config.stampsRequired,
      venueName: row.venueName,
      rewardName: config.reward,
      promotionChanged,
      outcome,
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

  /** Scadenza lazy delle pendenti scadute di un ambito: un locale (staff) o un cliente (solo da `pending`). */
  private async expirePending(scope: HistoryScope) {
    const inScope =
      "venueId" in scope
        ? eq(stampRequests.venueId, scope.venueId)
        : sql`${stampRequests.cardId} in (select c.id from ${cards} c where c.user_id = ${scope.userId})`;
    await db
      .update(stampRequests)
      .set({ status: RequestStatus.expired, resolvedAt: sql`now()` })
      .where(and(inScope, eq(stampRequests.status, RequestStatus.pending), lte(stampRequests.expiresAt, sql`now()`)));
  }

  /**
   * Storico delle richieste del locale (staff), dalla più recente. Tutti i filtri sono
   * opzionali e in AND. I timbri confermati (premio compreso) sono la somma delle quantità degli eventi della
   * richiesta (letti da `stamp_events`, nessun ricalcolo della regola timbri).
   * Date: `from` incluso; `to` incluso (una data senza ora vale fino a fine giornata UTC).
   * Mai l'email: solo il codice pubblico.
   * Paginato a cursore (B19): `limit` righe (default 25) in ordine `created_at DESC, id DESC`; `total` e le posizioni
   * si contano in SQL con gli stessi scope e filtri. Il cursore è solo una posizione: non allarga mai lo scope.
   */
  async getHistory(scope: HistoryScope, f: HistoryFilters): Promise<HistoryPage> {
    // Filtro per locale (solo cliente): il locale deve avere una card sua, in SQL. Un locale altrui,
    // senza card o inesistente dà lo stesso 404 (un 403 rivelerebbe che esiste).
    if (f.venueId && "userId" in scope) {
      const [card] = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.userId, scope.userId), eq(cards.venueId, f.venueId)))
        .limit(1);
      if (!card) throw new VenueNotFoundError();
    }

    await this.expirePending(scope); // una pendente scaduta va mostrata come `expired`

    const stamps = sql<number | null>`(select sum(e.quantity)::int from ${stampEvents} e
      where e.request_id = ${stampRequests.id} and e.venue_id = ${stampRequests.venueId})`;
    // L'ambito è sempre filtrato in SQL: il cliente vede solo richieste di card sue.
    const conds: (SQL | undefined)[] = [
      "venueId" in scope ? eq(stampRequests.venueId, scope.venueId) : eq(cards.userId, scope.userId),
    ];
    if (f.venueId && "userId" in scope) conds.push(eq(stampRequests.venueId, f.venueId));
    if (f.status) conds.push(eq(stampRequests.status, f.status));
    if (f.minStamps !== undefined) conds.push(sql`${stamps} >= ${f.minStamps}`);
    if (f.maxStamps !== undefined) conds.push(sql`${stamps} <= ${f.maxStamps}`);
    if (f.from) conds.push(sql`${stampRequests.createdAt} >= ${f.from}::timestamptz`);
    if (f.to) {
      conds.push(
        /^\d{4}-\d{2}-\d{2}$/.test(f.to)
          ? sql`${stampRequests.createdAt} < (${f.to}::date + 1)::timestamp at time zone 'UTC'`
          : sql`${stampRequests.createdAt} <= ${f.to}::timestamptz`,
      );
    }

    const limit = f.limit ?? HISTORY_DEFAULT_LIMIT;
    const cursor = f.cursor ? decodeCursor(f.cursor) : null;
    const pos = sql`(${stampRequests.createdAt}, ${stampRequests.id})`;
    const after = (c: Cursor, op: "<" | ">") => sql`${pos} ${sql.raw(op)} (${c.createdAt}::timestamptz, ${c.id}::uuid)`;
    const backwards = cursor?.direction === "p";
    const pageConds = cursor ? [...conds, after(cursor, backwards ? ">" : "<")] : conds;

    const fetched = await db
      .select({
        // testo UTC con microsecondi: è ciò che finisce nel cursore (un Date perderebbe i microsecondi)
        createdAtText: sql<string>`to_char(${stampRequests.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        requestId: stampRequests.id,
        publicCode: cards.publicCode,
        venueName: venues.name,
        displayName: users.displayName,
        status: stampRequests.status,
        createdAt: stampRequests.createdAt,
        resolvedAt: stampRequests.resolvedAt,
        stamps,
        stampsAdded: sql<number | null>`(select sum(e.quantity)::int from ${stampEvents} e
          where e.request_id = ${stampRequests.id} and e.venue_id = ${stampRequests.venueId} and e.type = 'stamp')`,
        rewardsRedeemed: sql<number | null>`(select count(*)::int from ${stampEvents} e
          where e.request_id = ${stampRequests.id} and e.venue_id = ${stampRequests.venueId} and e.type = 'redeem')`,
        // il premio è quello della promozione con cui la conferma ha scritto l'evento `redeem`
        reward: sql<string | null>`(select p.config->>'reward' from ${stampEvents} e
          join ${promotions} p on p.id = e.promotion_id and p.venue_id = e.venue_id
          where e.request_id = ${stampRequests.id} and e.venue_id = ${stampRequests.venueId} and e.type = 'redeem'
          order by e.idempotency_key limit 1)`,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .innerJoin(venues, eq(venues.id, stampRequests.venueId))
      .innerJoin(users, eq(users.id, cards.userId))
      .where(and(...pageConds))
      .orderBy(...(backwards ? [asc(stampRequests.createdAt), asc(stampRequests.id)] : [desc(stampRequests.createdAt), desc(stampRequests.id)]))
      .limit(limit);
    const rows = backwards ? fetched.reverse() : fetched;

    // Totale e posizione della pagina: stessi scope e filtri, una sola query.
    const first = rows[0];
    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        before: first
          ? sql<number>`(count(*) filter (where ${pos} > (${first.createdAtText}::timestamptz, ${first.requestId}::uuid)))::int`
          : sql<number>`0`,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .where(and(...conds));
    const total = counts?.total ?? 0;
    const pageStart = first ? counts.before + 1 : 0;
    const pageEnd = first ? pageStart + rows.length - 1 : 0;
    const last = rows[rows.length - 1];
    const prevCursor = first && pageStart > 1 ? encodeCursor({ direction: "p", createdAt: first.createdAtText, id: first.requestId }) : null;
    const nextCursor = last && pageEnd < total ? encodeCursor({ direction: "n", createdAt: last.createdAtText, id: last.requestId }) : null;

    const approved = (r: (typeof rows)[number]) => r.status === RequestStatus.approved;
    const items = rows.map((r) => ({
      requestId: r.requestId,
      publicCode: r.publicCode,
      venueName: r.venueName,
      displayName: r.displayName,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      stamps: approved(r) ? r.stamps : null,
      stampsAdded: approved(r) ? (r.stampsAdded ?? 0) : null,
      rewardsRedeemed: approved(r) ? (r.rewardsRedeemed ?? 0) : null,
      reward: approved(r) ? r.reward : null,
    }));
    return { items, total, pageStart, pageEnd, prevCursor, nextCursor };
  }

  /**
   * Coda staff: scadenza lazy del locale, poi le pendenti in ordine di arrivo.
   * La scadenza si fa qui perché una richiesta senza polling resterebbe `pending`
   * per sempre (occupando coda e indice parziale `one_pending_uq`).
   */
  async getPendingQueue(venueId: string, limit = 50): Promise<QueueItem[]> {
    await this.expirePending({ venueId });
    const active = await venueSrv.getActivePromotion(venueId);

    const rows = await db
      .select({
        requestId: stampRequests.id,
        publicCode: cards.publicCode,
        displayName: users.displayName,
        stampsCount: cards.stampsCount,
        cardPromotionId: cards.promotionId,
        config: promotions.config,
        createdAt: stampRequests.createdAt,
        expiresAt: stampRequests.expiresAt,
      })
      .from(stampRequests)
      .innerJoin(cards, and(eq(cards.id, stampRequests.cardId), eq(cards.venueId, stampRequests.venueId)))
      .innerJoin(promotions, and(eq(promotions.id, cards.promotionId), eq(promotions.venueId, cards.venueId)))
      .innerJoin(users, eq(users.id, cards.userId))
      .where(and(eq(stampRequests.venueId, venueId), eq(stampRequests.status, RequestStatus.pending)))
      .orderBy(asc(stampRequests.createdAt))
      .limit(limit);

    return rows.map((row) => {
      const changed = active !== null && active.id !== row.cardPromotionId;
      return {
        requestId: row.requestId,
        publicCode: row.publicCode,
        displayName: row.displayName,
        stampsCount: changed ? 0 : row.stampsCount,
        stampsRequired: promotionConfigSchema.parse(changed ? active.config : row.config).stampsRequired,
        promotionChanged: changed,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      };
    });
  }
}

export default new RequestsService();
