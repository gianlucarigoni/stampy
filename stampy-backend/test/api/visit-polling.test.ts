/**
 * POST /api/venues/:venueId/visit, POST /api/venues/:venueId/card/wallet-added
 * e GET /api/requests/:requestId con l'utente di sessione.
 *
 * Tocca il DB di sviluppo: crea un proprio locale (promozione da 10 timbri), utenti e sessioni
 * `visit-test-*@test.it`, e li elimina in afterAll.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("visit-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueId: string;

// Di default "Richiedi il timbro" (requestStamp=1). `query: ""` = semplice tocco sul tag.
const visit = (cookie?: string, o: { body?: unknown; query?: string; venue?: string } = {}) =>
  request(baseUrl, `/api/venues/${o.venue ?? venueId}/visit${o.query ?? "?requestStamp=1"}`, {
    method: "POST",
    cookie,
    body: o.body,
  });
const walletAdded = (cookie?: string, venue = venueId) =>
  request(baseUrl, `/api/venues/${venue}/card/wallet-added`, { method: "POST", cookie });
const poll = (requestId: string, cookie?: string) => request(baseUrl, `/api/requests/${requestId}`, { cookie });

const cardOf = async (userId: string) =>
  (await pool.query(`SELECT id, stamps_count, wallet_status FROM cards WHERE user_id = $1 AND venue_id = $2`, [userId, venueId])).rows[0] as
    | { id: string; stamps_count: number; wallet_status: string }
    | undefined;
const requestState = async (id: string) =>
  (await pool.query(`SELECT status, resolved_at FROM stamp_requests WHERE id = $1`, [id])).rows[0];
const pendingCount = async (cardId: string) =>
  (await pool.query(`SELECT count(*)::int AS n FROM stamp_requests WHERE card_id = $1 AND status = 'pending'`, [cardId])).rows[0].n as number;

const expect401 = (r: Res) => {
  expect(r.status).toBe(401);
  expect(r.body.message).toBe("Non autenticato");
};

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueId = await fx.newVenue("v", { stampsRequired: 10 });
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("autenticazione", () => {
  it("visit senza cookie → 401, e con params non validi resta 401 (auth prima della validazione)", async () => {
    expect401(await visit());
    expect401(await visit(undefined, { venue: "non-un-uuid" }));
  });

  it("visit con cookie fasullo → 401", async () => {
    expect401(await visit("x".repeat(43)));
  });

  it("visit con sessione di un utente anonimizzato → 401 e nessuna card creata", async () => {
    const burnt = await fx.newUserWithSession("anon", { anonymized: true });
    expect401(await visit(burnt.token));
    expect(await cardOf(burnt.id)).toBeUndefined();
  });

  it("polling senza cookie → 401", async () => {
    expect401(await poll(crypto.randomUUID()));
  });
});

describe("primo tocco e richiesta", () => {
  it("primo tocco: 201 card_created per l'utente di sessione; il `userId` nel body è ignorato", async () => {
    const owner = await fx.newUserWithSession("first");
    const other = await fx.newUserWithSession("first-other");
    const r = await visit(owner.token, { body: { userId: other.id } });

    expect(r.status).toBe(201);
    expect(r.body.state).toBe("card_created");
    expect(r.body.saveUrl).toEqual(expect.any(String));
    expect(r.body.publicCode).toHaveLength(8);
    const card = await cardOf(owner.id);
    expect(card?.stamps_count).toBe(0);
    expect(await cardOf(other.id)).toBeUndefined();
  });

  it("secondo tocco (requestStamp=1): 201 request_pending con requestId ed expiresAt, senza saveUrl", async () => {
    const u = await fx.newUserWithSession("second");
    await visit(u.token);
    const r = await visit(u.token);

    expect(r.status).toBe(201);
    expect(r.body.state).toBe("request_pending");
    expect(r.body.requestId).toHaveLength(36);
    expect(r.body.expiresAt).toEqual(expect.any(String));
    expect(r.body.saveUrl).toBeUndefined();
    expect((await requestState(r.body.requestId)).status).toBe("pending");
  });

  it("params non validi con sessione valida → 400 (visit con venue malformato, polling con UUID malformato)", async () => {
    const u = await fx.newUserWithSession("badparams");
    expect((await visit(u.token, { venue: "non-un-uuid" })).status).toBe(400);
    expect((await poll("non-un-uuid", u.token)).status).toBe(400);
  });
});

describe("polling", () => {
  it("il proprietario riceve 200 pending con solo {status, publicCode, expiresAt, stampsCount, stampsRequired}", async () => {
    const u = await fx.newUserWithSession("poll");
    await visit(u.token);
    const { body: v } = await visit(u.token);
    const r = await poll(v.requestId, u.token);

    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pending");
    expect(Object.keys(r.body).sort()).toEqual(["expiresAt", "promotionChanged", "publicCode", "stampsCount", "stampsRequired", "status"]);
    expect(r.body.stampsCount).toBe(0);
    expect(r.body.stampsRequired).toBe(10);
  });

  it("la richiesta di un altro utente → 404 identico a una inesistente, senza scrivere nulla", async () => {
    const owner = await fx.newUserWithSession("own404");
    const intruder = await fx.newUserWithSession("intruder");
    await visit(owner.token);
    const { body: v } = await visit(owner.token);

    const foreign = await poll(v.requestId, intruder.token);
    const missing = await poll(crypto.randomUUID(), intruder.token);

    expect(foreign.status).toBe(404);
    expect(foreign.body.error).toBe("RequestNotFound");
    expect(foreign.body).toEqual(missing.body);
    expect((await requestState(v.requestId)).status).toBe("pending");
  });

  it("scadenza lazy: una pending oltre expires_at diventa expired (DB e risposta) con resolved_at", async () => {
    const u = await fx.newUserWithSession("lazy");
    await visit(u.token);
    const { body: v } = await visit(u.token);
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [v.requestId]);

    const r = await poll(v.requestId, u.token);
    const db = await requestState(v.requestId);

    expect(r.status).toBe(200);
    expect(r.body.status).toBe("expired");
    expect(db.status).toBe("expired");
    expect(db.resolved_at).not.toBeNull();
  });

  it("dopo la scadenza un nuovo tocco crea una nuova richiesta; resta una sola pending per card", async () => {
    const u = await fx.newUserWithSession("after-exp");
    await visit(u.token);
    const { body: first } = await visit(u.token);
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [first.requestId]);
    await poll(first.requestId, u.token);

    const r = await visit(u.token);
    expect(r.status).toBe(201);
    expect(r.body.state).toBe("request_pending");
    expect(r.body.requestId).not.toBe(first.requestId);
    expect(await pendingCount((await cardOf(u.id))!.id)).toBe(1);
  });
});

describe("schermata Wallet: not_added → active", () => {
  it("semplice tocco con card not_added: 200 card_not_added, nessuna richiesta, wallet_status invariato", async () => {
    const u = await fx.newUserWithSession("w1");
    const created = await visit(u.token, { query: "" });
    const again = await visit(u.token, { query: "" });

    expect(created.status).toBe(201);
    expect(created.body.state).toBe("card_created");
    expect(again.status).toBe(200);
    expect(again.body.state).toBe("card_not_added");
    expect(again.body.saveUrl).toEqual(expect.any(String));
    expect(again.body.publicCode).toHaveLength(8);
    const card = (await cardOf(u.id))!;
    expect(await pendingCount(card.id)).toBe(0);
    expect(card.wallet_status).toBe("not_added");
  });

  it("'Richiedi il timbro' (requestStamp=1) apre la richiesta e lascia wallet_status; un tocco con richiesta viva riporta la stessa", async () => {
    const u = await fx.newUserWithSession("w2");
    await visit(u.token, { query: "" });
    const r = await visit(u.token, { query: "?requestStamp=1" });
    const plain = await visit(u.token, { query: "" });

    expect(r.status).toBe(201);
    expect(r.body.state).toBe("request_pending");
    expect((await cardOf(u.id))!.wallet_status).toBe("not_added");
    expect(plain.body.state).toBe("request_pending");
    expect(plain.body.requestId).toBe(r.body.requestId);
  });

  it("wallet-added: not_added → active (idempotente); poi il semplice tocco apre da solo la richiesta", async () => {
    const u = await fx.newUserWithSession("w3");
    await visit(u.token, { query: "" });
    const a = await walletAdded(u.token);
    const b = await walletAdded(u.token);
    const tap = await visit(u.token, { query: "" });

    expect(a.status).toBe(204);
    expect(b.status).toBe(204);
    expect((await cardOf(u.id))!.wallet_status).toBe("active");
    expect(tap.status).toBe(201);
    expect(tap.body.state).toBe("request_pending");
  });

  it("wallet-added: senza sessione 401, senza card 404 (e non la crea), UUID malformato 400; requestStamp diverso da 1 → 400", async () => {
    const u = await fx.newUserWithSession("w4");
    expect401(await walletAdded());
    expect((await walletAdded(u.token)).status).toBe(404);
    expect((await walletAdded(u.token, "non-un-uuid")).status).toBe(400);
    expect((await visit(u.token, { query: "?requestStamp=2" })).status).toBe(400);
    expect(await cardOf(u.id)).toBeUndefined();
  });

  it("wallet-added non tocca la card di un altro utente", async () => {
    const x = await fx.newUserWithSession("w5");
    const y = await fx.newUserWithSession("w6");
    await visit(x.token, { query: "" });

    expect((await walletAdded(y.token)).status).toBe(404);
    expect((await cardOf(x.id))!.wallet_status).toBe("not_added");
  });
});
