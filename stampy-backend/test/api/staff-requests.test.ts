/**
 * Staff: /venues/mine, coda, conferma/rifiuto, rate limit di `visit`, saldo nel polling.
 *
 * Tocca il DB di sviluppo: crea due propri locali (promozione da 10 timbri), utenti, sessioni e
 * membri `staff-test-*@test.it`, e li elimina in afterAll. L'aggiornamento del pass Google dopo
 * la conferma è sostituito da un finto (nessuna chiamata a Google).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("staff-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let staffA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let ownerA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let multi: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let intruder: Awaited<ReturnType<typeof fx.newUserWithSession>>;
const updateCard = vi.spyOn(walletSrv, "updateCard");

const visit = (venue: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
const poll = (requestId: string, cookie?: string) => request(baseUrl, `/api/requests/${requestId}`, { cookie });
const queue = (venue: string, cookie?: string) => request(baseUrl, `/api/venues/${venue}/requests`, { cookie });
const confirm = (venue: string, requestId: string, cookie?: string, body?: unknown) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/confirm`, { method: "POST", cookie, body });
const reject = (venue: string, requestId: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/reject`, { method: "POST", cookie });
const mine = (cookie?: string) => request(baseUrl, `/api/venues/mine`, { cookie });

/** Crea un cliente con card nel locale e una richiesta pending. */
async function customerWithRequest(tag: string, venue = venueA) {
  const c = await fx.newUserWithSession(tag);
  await visit(venue, c.token); // primo tocco: crea la card
  const v = await visit(venue, c.token);
  return { ...c, requestId: v.body.requestId as string };
}
const cardOf = async (userId: string, venue = venueA) =>
  (await pool.query(`SELECT id, stamps_count FROM cards WHERE user_id = $1 AND venue_id = $2`, [userId, venue])).rows[0] as
    | { id: string; stamps_count: number }
    | undefined;
const requestState = async (id: string) =>
  (await pool.query(`SELECT status, resolved_at, resolved_by FROM stamp_requests WHERE id = $1`, [id])).rows[0];
const eventsOf = async (requestId: string) =>
  (
    await pool.query(
      `SELECT type, quantity, idempotency_key, operator_id FROM stamp_events
        WHERE request_id = $1 ORDER BY split_part(idempotency_key, ':', 2)::int`,
      [requestId],
    )
  ).rows;
const segments = (events: { type: string; quantity: number }[]) => events.map((e) => `${e.type}:${e.quantity}`).join(",");

const expect401 = (r: Res) => {
  expect(r.status).toBe(401);
  expect(r.body.message).toBe("Non autenticato");
};
const expect403 = (r: Res) => {
  expect(r.status).toBe(403);
  expect(r.body.error).toBe("Forbidden");
};

beforeAll(async () => {
  updateCard.mockResolvedValue(undefined as any);
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a");
  venueB = await fx.newVenue("b");

  staffA = await fx.newUserWithSession("staff-a");
  await fx.addMember(staffA.id, venueA, "staff");
  ownerA = await fx.newUserWithSession("owner-a");
  await fx.addMember(ownerA.id, venueA, "owner");
  // membro di due locali: serve per il 404 "richiesta di un altro locale"
  multi = await fx.newUserWithSession("multi");
  await fx.addMember(multi.id, venueA, "staff");
  await fx.addMember(multi.id, venueB, "owner");
  intruder = await fx.newUserWithSession("intruder");
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/venues/mine", () => {
  it("senza cookie → 401", async () => {
    expect401(await mine());
  });

  it("utente senza ruoli → 200 con lista vuota", async () => {
    const r = await mine(intruder.token);
    expect(r.status).toBe(200);
    expect(r.body.venues).toEqual([]);
  });

  it("membro di due locali → 2 voci con il ruolo giusto e nessuna email", async () => {
    const r = await mine(multi.token);
    const byId = (id: string) => r.body.venues.find((v: any) => v.venueId === id);
    expect(r.status).toBe(200);
    expect(r.body.venues).toHaveLength(2);
    expect(byId(venueA).role).toBe("staff");
    expect(byId(venueB).role).toBe("owner");
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });
});

describe("coda: autorizzazione e contenuto", () => {
  it("senza cookie → 401", async () => {
    expect401(await queue(venueA));
  });

  it("utente autenticato ma non membro → 403", async () => {
    expect403(await queue(venueA, intruder.token));
  });

  it("venueId malformato con sessione valida → 403 (il ruolo viene prima della validazione)", async () => {
    expect403(await queue("non-un-uuid", staffA.token));
  });

  it("contiene la richiesta con publicCode, saldo e soglia, senza l'email del cliente", async () => {
    const c = await customerWithRequest("queue-content");
    const r = await queue(venueA, staffA.token);
    const item = r.body.requests.find((x: any) => x.requestId === c.requestId);

    expect(r.status).toBe(200);
    expect(item.publicCode).toHaveLength(8);
    expect(item.stampsCount).toBe(0);
    expect(item.stampsRequired).toBe(10);
    expect(item.createdAt).toEqual(expect.any(String));
    expect(item.expiresAt).toEqual(expect.any(String));
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });

  it("isolamento: la richiesta del locale B non compare nella coda di A, compare in quella di B", async () => {
    const c = await customerWithRequest("queue-iso", venueB);
    const inA = (await queue(venueA, staffA.token)).body.requests.some((x: any) => x.requestId === c.requestId);
    const inB = (await queue(venueB, multi.token)).body.requests.some((x: any) => x.requestId === c.requestId);
    expect(inA).toBe(false);
    expect(inB).toBe(true);
  });

  it("richiesta scaduta: la coda la scarta e la porta a expired", async () => {
    const c = await customerWithRequest("queue-exp");
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [c.requestId]);
    const q = await queue(venueA, staffA.token);
    expect(q.body.requests.some((x: any) => x.requestId === c.requestId)).toBe(false);
    expect((await requestState(c.requestId)).status).toBe("expired");
  });
});

describe("conferma", () => {
  it("quantità 15 da 0/10 → card 4/10, 3 eventi (stamp 10, redeem 1, stamp 4), resolved_by = operatore", async () => {
    const c = await customerWithRequest("confirm15");
    const r = await confirm(venueA, c.requestId, staffA.token, { stamps: 15 });
    const state = await requestState(c.requestId);
    const events = await eventsOf(c.requestId);

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "approved", stampsCount: 4, stampsRequired: 10, rewards: 1, stampsAdded: 14 });
    expect(r.body.reward).toEqual(expect.any(String));
    expect(r.body.cardId).toBeUndefined(); // il cardId è interno
    expect(state).toMatchObject({ status: "approved", resolved_by: staffA.id });
    expect(state.resolved_at).not.toBeNull();
    expect((await cardOf(c.id))!.stamps_count).toBe(4);
    expect(segments(events)).toBe("stamp:10,redeem:1,stamp:4");
    expect(events.map((e) => e.idempotency_key)).toEqual([1, 2, 3].map((n) => `${c.requestId}:${n}`));
    expect(events.every((e) => e.operator_id === staffA.id)).toBe(true);
  });

  it("il polling del cliente dopo la conferma è approved con saldo, stampsAdded, rewardsRedeemed e premio", async () => {
    const c = await customerWithRequest("confirm-poll");
    const r = await confirm(venueA, c.requestId, staffA.token, { stamps: 15 });
    const p = await poll(c.requestId, c.token);

    expect(p.status).toBe(200);
    expect(p.body).toMatchObject({ status: "approved", stampsCount: 4, stampsRequired: 10, stampsAdded: 14, rewardsRedeemed: 1, reward: r.body.reward });
  });

  it("dopo il commit aggiorna il pass Google; se Google fallisce la risposta resta 200", async () => {
    const c = await customerWithRequest("confirm-wallet");
    updateCard.mockClear();
    expect((await confirm(venueA, c.requestId, staffA.token, { stamps: 1 })).status).toBe(200);
    await vi.waitFor(() => expect(updateCard).toHaveBeenCalledTimes(1));

    const c2 = await customerWithRequest("confirm-wallet-ko");
    updateCard.mockRejectedValueOnce(new Error("Google down"));
    expect((await confirm(venueA, c2.requestId, staffA.token, { stamps: 1 })).status).toBe(200);
    expect((await cardOf(c2.id))!.stamps_count).toBe(1);
  });

  it("doppia conferma → 409, nessun evento in più, card invariata", async () => {
    const c = await customerWithRequest("double");
    await confirm(venueA, c.requestId, staffA.token, { stamps: 15 });
    const before = (await eventsOf(c.requestId)).length;

    const r = await confirm(venueA, c.requestId, staffA.token, { stamps: 15 });
    expect(r.status).toBe(409);
    expect((await eventsOf(c.requestId)).length).toBe(before);
    expect((await cardOf(c.id))!.stamps_count).toBe(4);
  });

  it.each([
    ["0", { stamps: 0 }],
    ["51", { stamps: 51 }],
    ["stringa '10'", { stamps: "10" }],
    ["1.5", { stamps: 1.5 }],
    ["assente", {}],
  ])("quantità non valida (%s) → 400", async (label, body) => {
    const c = await customerWithRequest(`invalid-qty-${label.replace(/\W/g, "")}`);
    expect((await confirm(venueA, c.requestId, staffA.token, body)).status).toBe(400);
    expect((await requestState(c.requestId)).status).toBe("pending");
  });

  it("la richiesta di un altro locale → 404 e resta pending (nessuna scrittura)", async () => {
    const c = await customerWithRequest("cross", venueB);
    const r = await confirm(venueA, c.requestId, multi.token, { stamps: 5 });
    expect(r.status).toBe(404);
    expect(r.body.error).toBe("RequestNotFound");
    expect((await requestState(c.requestId)).status).toBe("pending");
  });

  it("richiesta scaduta → 409 e nessun evento", async () => {
    const c = await customerWithRequest("confirm-exp");
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [c.requestId]);
    expect((await confirm(venueA, c.requestId, staffA.token, { stamps: 5 })).status).toBe(409);
    expect(await eventsOf(c.requestId)).toHaveLength(0);
  });

  it("card su una promozione vecchia → 409, richiesta ancora pending, nessun evento, card invariata", async () => {
    const oldPromo = await fx.newOldPromotion(venueA);
    const u = await fx.newUser("old-promo");
    const card = (
      await pool.query(
        `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
         VALUES ($1, $2, $3, 3, 'OLDPROMO', 'google', $4, 'not_added') RETURNING id`,
        [u.id, venueA, oldPromo, `test.${u.id}`],
      )
    ).rows[0].id;
    const req = (
      await pool.query(
        `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() + interval '3 minutes') RETURNING id`,
        [card, venueA],
      )
    ).rows[0].id;

    const r = await confirm(venueA, req, staffA.token, { stamps: 5 });

    expect(r.status).toBe(409);
    expect((await requestState(req)).status).toBe("pending");
    expect(await eventsOf(req)).toHaveLength(0);
    expect((await pool.query(`SELECT stamps_count FROM cards WHERE id = $1`, [card])).rows[0].stamps_count).toBe(3);
  });

  it("un owner ha lo stesso potere dello staff: 11 prodotti da 0 → card 0, 1 premio", async () => {
    const c = await customerWithRequest("owner-confirm");
    const r = await confirm(venueA, c.requestId, ownerA.token, { stamps: 11 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ stampsCount: 0, rewards: 1 });
    expect((await cardOf(c.id))!.stamps_count).toBe(0);
  });
});

describe("rifiuto", () => {
  it("200 rejected, resolved_by = operatore, nessun evento; il polling del cliente non ha campi di esito", async () => {
    const c = await customerWithRequest("reject");
    const r = await reject(venueA, c.requestId, staffA.token);
    const p = await poll(c.requestId, c.token);

    expect(r.status).toBe(200);
    expect(r.body.status).toBe("rejected");
    expect(await requestState(c.requestId)).toMatchObject({ status: "rejected", resolved_by: staffA.id });
    expect(await eventsOf(c.requestId)).toHaveLength(0);
    expect(p.body.status).toBe("rejected");
    for (const k of ["stampsAdded", "rewardsRedeemed", "reward"]) expect(p.body[k]).toBeUndefined();
  });

  it("conferma dopo un rifiuto → 409 e nessun evento", async () => {
    const c = await customerWithRequest("reject-then-confirm");
    await reject(venueA, c.requestId, staffA.token);
    expect((await confirm(venueA, c.requestId, staffA.token, { stamps: 5 })).status).toBe(409);
    expect(await eventsOf(c.requestId)).toHaveLength(0);
  });
});

describe("soglia esatta e card piena (regola dei timbri via API)", () => {
  it("quantità 10 → card piena 10/10, nessun premio consumato, un solo evento stamp 10", async () => {
    const c = await customerWithRequest("exact");
    const r = await confirm(venueA, c.requestId, staffA.token, { stamps: 10 });
    const p = await poll(c.requestId, c.token);
    const events = await eventsOf(c.requestId);

    expect(r.body).toMatchObject({ stampsCount: 10, rewards: 0, stampsAdded: 10 });
    expect(p.body).toMatchObject({ stampsAdded: 10, rewardsRedeemed: 0 });
    expect((await cardOf(c.id))!.stamps_count).toBe(10);
    expect(segments(events)).toBe("stamp:10");
  });

  it("card piena: il prodotto successivo è gratis → 0 timbri, premio consumato, un solo evento redeem 1", async () => {
    const c = await customerWithRequest("full");
    await confirm(venueA, c.requestId, staffA.token, { stamps: 10 });
    const next = await visit(venueA, c.token);
    const r = await confirm(venueA, next.body.requestId, staffA.token, { stamps: 1 });
    const p = await poll(next.body.requestId, c.token);

    expect(r.body).toMatchObject({ stampsCount: 0, rewards: 1, stampsAdded: 0 });
    expect(p.body).toMatchObject({ stampsAdded: 0, rewardsRedeemed: 1 });
    expect((await cardOf(c.id))!.stamps_count).toBe(0);
    expect(segments(await eventsOf(next.body.requestId))).toBe("redeem:1");
  });

  it("card piena + quantità 13 → redeem, stamp 10, redeem, stamp 1: card 1/10 con 2 premi", async () => {
    const c = await customerWithRequest("full13");
    await confirm(venueA, c.requestId, staffA.token, { stamps: 10 });
    const next = await visit(venueA, c.token);
    const r = await confirm(venueA, next.body.requestId, staffA.token, { stamps: 13 });
    const events = await eventsOf(next.body.requestId);

    expect(r.body).toMatchObject({ stampsCount: 1, rewards: 2 });
    expect(segments(events)).toBe("redeem:1,stamp:10,redeem:1,stamp:1");
    expect(events.filter((e) => e.type === "stamp").reduce((n, e) => n + e.quantity, 0)).toBe(11);
  });
});

describe("rate limit di visit (10 nuove richieste/ora per card)", () => {
  async function cardWithClosedRequests(tag: string, n: number) {
    const c = await fx.newUserWithSession(tag);
    await visit(venueA, c.token); // crea la card
    const card = (await cardOf(c.id))!;
    await pool.query(
      `INSERT INTO stamp_requests (card_id, venue_id, status, created_at, expires_at, resolved_at)
       SELECT $1, $2, 'expired', now() - interval '5 minutes', now() - interval '2 minutes', now() - interval '2 minutes'
         FROM generate_series(1, $3)`,
      [card.id, venueA, n],
    );
    return { ...c, cardId: card.id };
  }
  const total = async (cardId: string) =>
    (await pool.query(`SELECT count(*)::int AS n FROM stamp_requests WHERE card_id = $1`, [cardId])).rows[0].n as number;

  it("l'undicesima richiesta nell'ora → 429 con Retry-After (1..3600), nessuna pending creata", async () => {
    const c = await cardWithClosedRequests("rate", 10);
    const r = await visit(venueA, c.token);
    const retryAfter = Number(r.headers.get("retry-after"));

    expect(r.status).toBe(429);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(3600);
    expect(await total(c.cardId)).toBe(10);
  });

  it("un nuovo tocco con una pending viva → 200 request_pending e non consuma quota", async () => {
    const c = await cardWithClosedRequests("rate-pending", 9);
    const first = await visit(venueA, c.token); // la decima, ancora ammessa
    expect(first.status).toBe(201);

    const again = await visit(venueA, c.token);
    expect(again.status).toBe(200);
    expect(again.body.state).toBe("request_pending");
    expect(again.body.requestId).toBe(first.body.requestId);
    expect(await total(c.cardId)).toBe(10);
  });
});
