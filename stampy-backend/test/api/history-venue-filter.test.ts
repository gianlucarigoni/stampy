/**
 * B34: filtro `venueId` su GET /requests/mine (solo cliente). Il locale deve essere uno in cui
 * il cliente ha una card; altrimenti 404 identico a quello di un locale inesistente.
 *
 * Tocca il DB del worktree: crea propri locali e utenti `vfilter-test-*` e li elimina in afterAll.
 * L'aggiornamento del pass Google è sostituito da un finto.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("vfilter-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let venueC: string; // solo c2 ha una card
let venueE: string; // esiste, nessuna card
let staffA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let c1: Awaited<ReturnType<typeof fx.newUserWithSession>>; // 2 richieste in A, 1 in B
let c2: Awaited<ReturnType<typeof fx.newUserWithSession>>; // 1 richiesta in C
let ids: Record<string, string>;
vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);

const mine = (cookie: string | undefined, qs = "") =>
  request(baseUrl, `/api/requests/mine${qs ? "?" + qs : ""}`, { cookie });
const venueIdsOf = (r: { body: any }) => r.body.requests.map((x: any) => x.requestId).sort();
const sorted = (...v: string[]) => [...v].sort();

async function newPending(venue: string, cookie: string): Promise<string> {
  await request(baseUrl, `/api/venues/${venue}/visit`, { method: "POST", cookie });
  const v = await request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
  return v.body.requestId as string;
}
const nextPending = async (venue: string, cookie: string) =>
  (await request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie })).body.requestId as string;

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  [venueA, venueB, venueC, venueE] = await Promise.all(["a", "b", "c", "e"].map((t) => fx.newVenue(t)));
  staffA = await fx.newUserWithSession("staff-a");
  await fx.addMember(staffA.id, venueA, "staff");
  c1 = await fx.newUserWithSession("c1");
  c2 = await fx.newUserWithSession("c2");
  const staffB = await fx.newUserWithSession("staff-b");
  await fx.addMember(staffB.id, venueB, "staff");
  ids = {};
  // c1 in A: una approved (poi nuova richiesta pending)
  ids.a1 = await newPending(venueA, c1.token);
  await request(baseUrl, `/api/venues/${venueA}/requests/${ids.a1}/confirm`, { method: "POST", cookie: staffA.token, body: { stamps: 2 } });
  ids.a2 = await nextPending(venueA, c1.token);
  ids.b1 = await newPending(venueB, c1.token);
  ids.c1 = await newPending(venueC, c2.token);
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/requests/mine?venueId=", () => {
  it("senza venueId: tutte le richieste del cliente, in tutti i locali", async () => {
    const r = await mine(c1.token);
    expect(r.status).toBe(200);
    expect(venueIdsOf(r)).toEqual(sorted(ids.a1, ids.a2, ids.b1));
  });

  it("con venueId di un locale con card: solo le richieste di quel locale", async () => {
    const a = await mine(c1.token, `venueId=${venueA}`);
    expect(a.status).toBe(200);
    expect(venueIdsOf(a)).toEqual(sorted(ids.a1, ids.a2));
    const b = await mine(c1.token, `venueId=${venueB}`);
    expect(venueIdsOf(b)).toEqual([ids.b1]);
    expect(b.body.requests[0].venueName).toBe("Test b");
  });

  it("si combina con gli altri filtri", async () => {
    const r = await mine(c1.token, `venueId=${venueA}&status=approved`);
    expect(r.status).toBe(200);
    expect(venueIdsOf(r)).toEqual([ids.a1]);
  });

  it("venueId di un locale in cui il cliente non ha card → 404", async () => {
    const r = await mine(c1.token, `venueId=${venueC}`);
    expect(r.status).toBe(404);
  });

  it("il 404 è identico per locale altrui, locale senza card e UUID inesistente, senza dati", async () => {
    const others = await mine(c1.token, `venueId=${venueC}`); // la card è di un altro cliente
    const noCards = await mine(c1.token, `venueId=${venueE}`);
    const missing = await mine(c1.token, `venueId=${crypto.randomUUID()}`);
    for (const r of [others, noCards, missing]) expect(r.status).toBe(404);
    expect(noCards.body).toEqual(others.body);
    expect(missing.body).toEqual(others.body);
    expect(JSON.stringify(others.body)).not.toMatch(/Test c|requests|publicCode/);
  });

  it("un altro cliente non vede le richieste altrui anche con il venueId giusto", async () => {
    expect((await mine(c2.token, `venueId=${venueA}`)).status).toBe(404);
    const own = await mine(c2.token, `venueId=${venueC}`);
    expect(own.status).toBe(200);
    expect(venueIdsOf(own)).toEqual([ids.c1]);
  });

  it.each([["venueId=non-un-uuid"], ["venueId="]])("%s → 400", async (qs) => {
    expect((await mine(c1.token, qs)).status).toBe(400);
  });

  it("venueId ripetuto → 400", async () => {
    expect((await mine(c1.token, `venueId=${venueA}&venueId=${venueB}`)).status).toBe(400);
  });

  it("senza sessione → 401 anche con venueId", async () => {
    expect((await mine(undefined, `venueId=${venueA}`)).status).toBe(401);
  });
});

describe("storico dello staff", () => {
  it("GET /venues/:venueId/requests/history?venueId=… → 400 (il filtro è solo per il cliente)", async () => {
    const r = await request(baseUrl, `/api/venues/${venueA}/requests/history?venueId=${venueA}`, { cookie: staffA.token });
    expect(r.status).toBe(400);
  });
});
