/**
 * Cambio di promozione: rollover lazy alla conferma + avviso `promotionChanged` (visit, polling, coda).
 *
 * Decisione (2026-11-09): se un locale cambia promozione, il cliente perde i timbri della vecchia e
 * riparte da zero con la nuova alla prima richiesta confermata. L'azzeramento è lazy (alla conferma
 * dello staff), la card piena si azzera come le altre, e l'avviso NON mostra mai quanti timbri si perdono.
 *
 * Tocca il DB di sviluppo: crea propri locali, utenti e promozioni `rollover-test-*` e li elimina in
 * afterAll. L'aggiornamento del pass Google è sostituito da un finto.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("rollover-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string; // promozione attiva da 10
let venueB: string; // promozione attiva da 10 (isolamento)
let venueC: string; // promozione attiva da 6
let venueD: string; // nessuna promozione attiva
let staff: Awaited<ReturnType<typeof fx.newUserWithSession>>; // staff di A e C, owner di D
let multi: Awaited<ReturnType<typeof fx.newUserWithSession>>; // staff di A, owner di B
const updateCard = vi.spyOn(walletSrv, "updateCard");

const visit = (venue: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
const poll = (requestId: string, cookie?: string) => request(baseUrl, `/api/requests/${requestId}`, { cookie });
const queue = (venue: string, cookie?: string) => request(baseUrl, `/api/venues/${venue}/requests`, { cookie });
const confirm = (venue: string, requestId: string, cookie?: string, body?: unknown) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/confirm`, { method: "POST", cookie, body });
const reject = (venue: string, requestId: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/reject`, { method: "POST", cookie });

// una sola promozione "vecchia" per locale (promotions_no_overlap vieta due intervalli uguali)
const oldPromos = new Map<string, string>();
async function oldPromoOf(venue: string) {
  if (!oldPromos.has(venue)) oldPromos.set(venue, await fx.newOldPromotion(venue));
  return oldPromos.get(venue)!;
}
const activePromoOf = async (venue: string) =>
  (
    await pool.query(
      `SELECT id FROM promotions WHERE venue_id = $1 AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())`,
      [venue],
    )
  ).rows[0]?.id as string | undefined;

let seq = 0;
/** Cliente con card ferma sulla promozione VECCHIA del locale, con `stamps` timbri e (se `pending`) una richiesta pending. */
async function staleCustomer(tag: string, venue: string, stamps: number, o: { pending?: boolean } = {}) {
  const u = await fx.newUserWithSession(tag);
  const oldPromo = await oldPromoOf(venue);
  const code = `R${(++seq).toString().padStart(3, "0")}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 8);
  const cardId: string = (
    await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
       VALUES ($1, $2, $3, $4, $5, 'google', $6, 'active') RETURNING id`,
      [u.id, venue, oldPromo, stamps, code, `test.${u.id}`],
    )
  ).rows[0].id;
  let requestId: string | undefined;
  if (o.pending !== false) {
    requestId = (
      await pool.query(
        `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() + interval '3 minutes') RETURNING id`,
        [cardId, venue],
      )
    ).rows[0].id as string;
  }
  return { ...u, cardId, requestId: requestId as string, oldPromo };
}

/** Cliente con card già sulla promozione attiva e una richiesta pending (passa dall'API). */
async function freshCustomer(tag: string, venue = venueA) {
  const c = await fx.newUserWithSession(tag);
  await visit(venue, c.token); // crea la card
  const v = await visit(venue, c.token);
  return { ...c, requestId: v.body.requestId as string };
}

const card = async (id: string) =>
  (await pool.query(`SELECT stamps_count, promotion_id FROM cards WHERE id = $1`, [id])).rows[0] as {
    stamps_count: number;
    promotion_id: string;
  };
const eventsOf = async (requestId: string) =>
  (await pool.query(`SELECT type, quantity, promotion_id FROM stamp_events WHERE request_id = $1`, [requestId])).rows as {
    type: string;
    quantity: number;
    promotion_id: string;
  }[];

beforeAll(async () => {
  updateCard.mockResolvedValue(undefined as any);
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a");
  venueB = await fx.newVenue("b");
  venueC = await fx.newVenue("c", { stampsRequired: 6 });
  venueD = await fx.newVenue("d");

  staff = await fx.newUserWithSession("staff");
  await fx.addMember(staff.id, venueA, "staff");
  await fx.addMember(staff.id, venueC, "staff");
  await fx.addMember(staff.id, venueD, "owner");
  multi = await fx.newUserWithSession("multi");
  await fx.addMember(multi.id, venueA, "staff");
  await fx.addMember(multi.id, venueB, "owner");

  // venueD: nessuna promozione attiva (l'unica è già finita)
  await pool.query(`UPDATE promotions SET ends_at = now() - interval '1 hour' WHERE venue_id = $1`, [venueD]);
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("conferma con promozione cambiata (rollover lazy)", () => {
  it("card a 3 timbri sulla vecchia promozione, conferma 5 → 200, stampsCount 5, promotion_id aggiornato", async () => {
    const c = await staleCustomer("r1", venueA, 3);
    const r = await confirm(venueA, c.requestId, staff.token, { stamps: 5 });

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "approved", stampsCount: 5, stampsRequired: 10, rewards: 0, stampsAdded: 5 });
    expect(await card(c.cardId)).toEqual({ stamps_count: 5, promotion_id: await activePromoOf(venueA) });
  });

  it("i timbri vecchi non contano: card a 8/10 vecchia, conferma 4 → 4 e non 2 (nessun premio)", async () => {
    const c = await staleCustomer("r2", venueA, 8);
    const r = await confirm(venueA, c.requestId, staff.token, { stamps: 4 });

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ stampsCount: 4, rewards: 0 });
    expect((await card(c.cardId)).stamps_count).toBe(4);
  });

  it("card piena sulla vecchia (10/10), conferma 2 → azzerata: stampsCount 2, rewards 0", async () => {
    const c = await staleCustomer("r3", venueA, 10);
    const r = await confirm(venueA, c.requestId, staff.token, { stamps: 2 });

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ stampsCount: 2, rewards: 0 });
    expect((await card(c.cardId)).stamps_count).toBe(2);
  });

  it("gli eventi riportano la promozione NUOVA e la somma dei timbri è quella confermata", async () => {
    const c = await staleCustomer("r4", venueA, 7);
    await confirm(venueA, c.requestId, staff.token, { stamps: 5 });

    const events = await eventsOf(c.requestId);
    const active = await activePromoOf(venueA);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.promotion_id === active)).toBe(true);
    expect(events.reduce((s, e) => s + e.quantity, 0)).toBe(5);
  });

  it("la soglia è quella della nuova promozione (nuova da 6: conferma 7 → 1 premio, saldo 0)", async () => {
    const c = await staleCustomer("r5", venueC, 3);
    const r = await confirm(venueC, c.requestId, staff.token, { stamps: 7 });

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ stampsRequired: 6, stampsCount: 0, rewards: 1 });
  });

  it("dopo il rollover, una seconda conferma sulla stessa card non riazzera", async () => {
    const c = await staleCustomer("r6", venueA, 4);
    expect((await confirm(venueA, c.requestId, staff.token, { stamps: 5 })).status).toBe(200);

    const next = await visit(venueA, c.token); // nuova richiesta
    const r = await confirm(venueA, next.body.requestId, staff.token, { stamps: 2 });

    expect(r.status).toBe(200);
    expect(r.body.stampsCount).toBe(7);
  });

  it("richiesta rifiutata → card invariata: promotion_id e stamps_count restano quelli vecchi", async () => {
    const c = await staleCustomer("r7", venueA, 3);
    expect((await reject(venueA, c.requestId, staff.token)).status).toBe(200);

    expect(await card(c.cardId)).toEqual({ stamps_count: 3, promotion_id: c.oldPromo });
  });

  it("richiesta scaduta → 409 e card invariata (nessun rollover)", async () => {
    const c = await staleCustomer("r8", venueA, 3);
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [c.requestId]);

    expect((await confirm(venueA, c.requestId, staff.token, { stamps: 5 })).status).toBe(409);
    expect(await card(c.cardId)).toEqual({ stamps_count: 3, promotion_id: c.oldPromo });
    expect(await eventsOf(c.requestId)).toHaveLength(0);
  });

  it("doppia conferma concorrente → una sola vince (200 e 409), il rollover avviene una volta sola", async () => {
    const c = await staleCustomer("r9", venueA, 3);
    const [x, y] = await Promise.all([
      confirm(venueA, c.requestId, staff.token, { stamps: 5 }),
      confirm(venueA, c.requestId, staff.token, { stamps: 5 }),
    ]);

    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect((await card(c.cardId)).stamps_count).toBe(5);
    expect((await eventsOf(c.requestId)).reduce((s, e) => s + e.quantity, 0)).toBe(5);
  });

  it("nessuna promozione attiva → 409 e card invariata", async () => {
    const c = await staleCustomer("r10", venueD, 3);
    const r = await confirm(venueD, c.requestId, staff.token, { stamps: 5 });

    expect(r.status).toBe(409);
    expect(await card(c.cardId)).toEqual({ stamps_count: 3, promotion_id: c.oldPromo });
  });

  it("richiesta di un altro locale → 404 identico, nessun rollover", async () => {
    const c = await staleCustomer("r11", venueB, 3);
    const r = await confirm(venueA, c.requestId, multi.token, { stamps: 5 });

    expect(r.status).toBe(404);
    expect(r.body.error).toBe("RequestNotFound");
    expect(await card(c.cardId)).toEqual({ stamps_count: 3, promotion_id: c.oldPromo });
  });
});

describe("avviso alla richiesta: visit", () => {
  it("card sulla promozione attiva → promotionChanged false", async () => {
    const c = await fx.newUserWithSession("v1");
    await visit(venueA, c.token);
    const r = await visit(venueA, c.token);

    expect(r.body.state).toBe("request_pending");
    expect(r.body.promotionChanged).toBe(false);
  });

  it("card sulla vecchia promozione, nuova richiesta → 201 request_pending con promotionChanged true", async () => {
    const c = await staleCustomer("v2", venueA, 3, { pending: false });
    const r = await visit(venueA, c.token);

    expect(r.status).toBe(201);
    expect(r.body.state).toBe("request_pending");
    expect(r.body.promotionChanged).toBe(true);
  });

  it("richiesta già pending per una card vecchia → 200 con promotionChanged true", async () => {
    const c = await staleCustomer("v3", venueA, 3);
    const r = await visit(venueA, c.token);

    expect(r.status).toBe(200);
    expect(r.body.requestId).toBe(c.requestId);
    expect(r.body.promotionChanged).toBe(true);
  });

  it("card nuova (card_created) → nessun promotionChanged", async () => {
    const c = await fx.newUserWithSession("v4");
    const r = await visit(venueA, c.token);

    expect(r.status).toBe(201);
    expect(r.body.state).toBe("card_created");
    expect(r.body).not.toHaveProperty("promotionChanged");
  });

  it("visit non modifica la card: promotion_id e stamps_count restano quelli vecchi", async () => {
    const c = await staleCustomer("v5", venueA, 3, { pending: false });
    await visit(venueA, c.token);

    expect(await card(c.cardId)).toEqual({ stamps_count: 3, promotion_id: c.oldPromo });
  });
});

describe("avviso nel polling del cliente", () => {
  it("pending su card vecchia → promotionChanged true, stampsCount 0, stampsRequired della nuova promozione", async () => {
    const c = await staleCustomer("p1", venueC, 3);
    const r = await poll(c.requestId, c.token);

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "pending", promotionChanged: true, stampsCount: 0, stampsRequired: 6 });
  });

  it("pending su card aggiornata → promotionChanged false", async () => {
    const c = await freshCustomer("p2");
    const r = await poll(c.requestId, c.token);

    expect(r.body.status).toBe("pending");
    expect(r.body.promotionChanged).toBe(false);
  });

  it("dopo la conferma (approved) → promotionChanged false e saldo reale", async () => {
    const c = await staleCustomer("p3", venueA, 3);
    await confirm(venueA, c.requestId, staff.token, { stamps: 4 });
    const r = await poll(c.requestId, c.token);

    expect(r.body).toMatchObject({ status: "approved", promotionChanged: false, stampsCount: 4 });
  });

  it("rejected su card vecchia → promotionChanged true finché la card non viene aggiornata", async () => {
    const c = await staleCustomer("p4", venueA, 3);
    await reject(venueA, c.requestId, staff.token);
    const r = await poll(c.requestId, c.token);

    expect(r.body.status).toBe("rejected");
    expect(r.body.promotionChanged).toBe(true);
  });

  it("expired su card vecchia → promotionChanged true", async () => {
    const c = await staleCustomer("p5", venueA, 3);
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [c.requestId]);
    const r = await poll(c.requestId, c.token);

    expect(r.body.status).toBe("expired");
    expect(r.body.promotionChanged).toBe(true);
  });

  it("la risposta non contiene mai il numero dei timbri persi", async () => {
    const c = await staleCustomer("p6", venueC, 4);
    const r = await poll(c.requestId, c.token);

    const keys = Object.keys(r.body).join(",");
    expect(keys).not.toMatch(/previous|lost|persi|old/i);
    expect(r.body.stampsCount).toBe(0); // non 4
  });

  it("richiesta di un altro utente → 404 identico", async () => {
    const c = await staleCustomer("p7", venueA, 3);
    const other = await fx.newUserWithSession("p7-other");
    const r = await poll(c.requestId, other.token);

    expect(r.status).toBe(404);
  });
});

describe("avviso nella coda dello staff", () => {
  it("richiesta pending di una card vecchia → promotionChanged true, stampsCount 0, soglia nuova", async () => {
    const c = await staleCustomer("q1", venueC, 3);
    const item = (await queue(venueC, staff.token)).body.requests.find((x: any) => x.requestId === c.requestId);

    expect(item).toMatchObject({ promotionChanged: true, stampsCount: 0, stampsRequired: 6 });
  });

  it("richiesta di una card aggiornata → promotionChanged false", async () => {
    const c = await freshCustomer("q2");
    const item = (await queue(venueA, staff.token)).body.requests.find((x: any) => x.requestId === c.requestId);

    expect(item.promotionChanged).toBe(false);
  });

  it("la coda non espone email né il numero dei timbri persi", async () => {
    const c = await staleCustomer("q3", venueC, 4);
    const r = await queue(venueC, staff.token);
    const item = r.body.requests.find((x: any) => x.requestId === c.requestId);

    expect(JSON.stringify(r.body)).not.toContain("@test.it");
    expect(Object.keys(item).join(",")).not.toMatch(/previous|lost|persi|old/i);
    expect(item.stampsCount).toBe(0); // non 4
  });

  it("isolamento tra locali: la coda del locale B non mostra la richiesta del locale C", async () => {
    const c = await staleCustomer("q4", venueC, 3);
    const inB = (await queue(venueB, multi.token)).body.requests.some((x: any) => x.requestId === c.requestId);

    expect(inB).toBe(false);
  });
});
