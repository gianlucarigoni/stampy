/**
 * B38: il 409 «Richiesta non più valida» di confirm/reject porta `reason` (expired | approved | rejected),
 * letto dallo stato della riga. 404 e 409 «Nessuna promozione attiva…» restano senza `reason`.
 *
 * Usa il DB del worktree: crea propri locali, utenti e richieste `resolve-reason-*@test.it`, ripuliti in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import resolveSrv from "../../src/api/requests/resolve/resolve.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("resolve-reason");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let venueC: string;
let staffA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let multi: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffC: Awaited<ReturnType<typeof fx.newUserWithSession>>;
const updateCard = vi.spyOn(walletSrv, "updateCard");

const visit = (venue: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
const confirm = (venue: string, requestId: string, cookie?: string, body: unknown = { stamps: 5 }) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/confirm`, { method: "POST", cookie, body });
const reject = (venue: string, requestId: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/reject`, { method: "POST", cookie });

async function pendingRequest(tag: string, venue = venueA) {
  const c = await fx.newUserWithSession(tag);
  await visit(venue, c.token); // primo tocco: crea la card
  const v = await visit(venue, c.token);
  return v.body.requestId as string;
}
const expire = (id: string) =>
  pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id]);
const statusOf = async (id: string) =>
  (await pool.query(`SELECT status FROM stamp_requests WHERE id = $1`, [id])).rows[0].status as string;

const expect409 = (r: { status: number; body: any }, reason: string) => {
  expect(r.status).toBe(409);
  expect(r.body.message).toBe("Richiesta non più valida");
  expect(r.body.reason).toBe(reason);
};

beforeAll(async () => {
  updateCard.mockResolvedValue(undefined as any);
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a");
  venueB = await fx.newVenue("b");
  venueC = await fx.newVenue("c");
  staffA = await fx.newUserWithSession("staff-a");
  await fx.addMember(staffA.id, venueA, "staff");
  multi = await fx.newUserWithSession("multi");
  await fx.addMember(multi.id, venueA, "staff");
  await fx.addMember(multi.id, venueB, "owner");
  staffC = await fx.newUserWithSession("staff-c");
  await fx.addMember(staffC.id, venueC, "staff");
});
afterAll(async () => {
  vi.restoreAllMocks();
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("409 di confirm/reject: reason", () => {
  it("confirm su richiesta scaduta → 409, reason 'expired', message invariato", async () => {
    const id = await pendingRequest("c-exp");
    await expire(id);
    expect409(await confirm(venueA, id, staffA.token), "expired");
  });

  it("reject su richiesta scaduta → 409, reason 'expired'", async () => {
    const id = await pendingRequest("r-exp");
    await expire(id);
    expect409(await reject(venueA, id, staffA.token), "expired");
  });

  it("doppia conferma → il secondo confirm è 409 con reason 'approved'", async () => {
    const id = await pendingRequest("double");
    expect((await confirm(venueA, id, staffA.token)).status).toBe(200);
    expect409(await confirm(venueA, id, staffA.token), "approved");
  });

  it("reject su richiesta già approvata → 409, reason 'approved'", async () => {
    const id = await pendingRequest("rej-appr");
    await confirm(venueA, id, staffA.token);
    expect409(await reject(venueA, id, staffA.token), "approved");
  });

  it("reject su richiesta già rifiutata → 409, reason 'rejected'", async () => {
    const id = await pendingRequest("rej-rej");
    await reject(venueA, id, staffA.token);
    expect409(await reject(venueA, id, staffA.token), "rejected");
  });

  it("confirm su richiesta già rifiutata → 409, reason 'rejected'", async () => {
    const id = await pendingRequest("conf-rej");
    await reject(venueA, id, staffA.token);
    expect409(await confirm(venueA, id, staffA.token), "rejected");
  });

  it("richiesta ancora pending ma ormai scaduta (race sull'orologio) → reason 'expired'", async () => {
    const id = await pendingRequest("race");
    await expire(id);
    // la scadenza lazy non scatta: la riga resta `pending` quando si compone il 409
    const spy = vi.spyOn(resolveSrv as any, "expireIfDue").mockResolvedValue(undefined);
    try {
      expect409(await confirm(venueA, id, staffA.token), "expired");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("404 e 409 senza reason", () => {
  it("richiesta di un altro locale → 404 RequestNotFound, senza reason (confirm e reject), resta pending", async () => {
    const id = await pendingRequest("cross", venueB);
    for (const r of [await confirm(venueA, id, multi.token), await reject(venueA, id, multi.token)]) {
      expect(r.status).toBe(404);
      expect(r.body.error).toBe("RequestNotFound");
      expect(r.body).not.toHaveProperty("reason");
    }
    expect(await statusOf(id)).toBe("pending");
  });

  it("UUID inesistente → 404 con lo stesso body di quello dell'altro locale", async () => {
    const other = await pendingRequest("cross2", venueB);
    const real = await confirm(venueA, other, multi.token);
    const missing = await confirm(venueA, randomUUID(), staffA.token);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(real.body);
  });

  it("409 «Nessuna promozione attiva per questo locale» → message invariato, senza reason", async () => {
    const id = await pendingRequest("nopromo", venueC);
    await pool.query(`UPDATE promotions SET ends_at = now() - interval '1 hour' WHERE venue_id = $1`, [venueC]);
    const r = await confirm(venueC, id, staffC.token);
    expect(r.status).toBe(409);
    expect(r.body.message).toBe("Nessuna promozione attiva per questo locale");
    expect(r.body).not.toHaveProperty("reason");
  });
});
