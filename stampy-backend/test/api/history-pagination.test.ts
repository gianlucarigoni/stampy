/**
 * B19: paginazione a cursore dei due storici (staff: GET /venues/:venueId/requests/history;
 * cliente: GET /requests/mine). Risposta: { requests, total, pageStart, pageEnd, prevCursor, nextCursor }.
 * `limit` 1..100, default 25; `offset` e cursori malformati → 400.
 *
 * Tocca il DB del worktree: crea propri locali e utenti `page-test-*`, richieste inserite in SQL con
 * `created_at` controllati; tutto eliminato in afterAll.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("page-test");
vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);
let baseUrl: string;
let stop: () => Promise<void>;
type U = Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staff: U; // membro di A, L, T, M, P, E
let staffB: U; // membro di B
let m1: U; // cliente con card in X e Y
let m2: U; // cliente con card in X
let V: Record<string, string>; // locali
let A: string[]; // id delle 7 richieste di A, dalla più recente (indice 0) alla più vecchia

const hist = (venue: string, qs = "", cookie = staff.token) =>
  request(baseUrl, `/api/venues/${venue}/requests/history${qs ? "?" + qs : ""}`, { cookie });
const mine = (cookie: string, qs = "") => request(baseUrl, `/api/requests/mine${qs ? "?" + qs : ""}`, { cookie });
const ids = (r: Res): string[] => r.body.requests.map((x: any) => x.requestId);

async function seedCard(userId: string, venueId: string): Promise<string> {
  const promo = (await pool.query(`SELECT id FROM promotions WHERE venue_id = $1 AND ends_at IS NULL`, [venueId])).rows[0].id;
  const code = crypto.randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
  return (
    await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
       VALUES ($1, $2, $3, 0, $4, 'google', $5, 'active') RETURNING id`,
      [userId, venueId, promo, code, `test.${crypto.randomUUID()}`],
    )
  ).rows[0].id;
}
async function seedReq(cardId: string, venueId: string, status: string, createdAt: string): Promise<string> {
  return (
    await pool.query(
      `INSERT INTO stamp_requests (card_id, venue_id, status, created_at, expires_at, resolved_at)
       VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz + interval '3 minutes', $4::timestamptz + interval '1 minute') RETURNING id`,
      [cardId, venueId, status, createdAt],
    )
  ).rows[0].id;
}
/** Cammina in avanti con nextCursor e restituisce le pagine. */
async function walk(call: (qs: string) => Promise<Res>, qs: string): Promise<Res[]> {
  const pages: Res[] = [];
  let cursor: string | null = null;
  do {
    const r: Res = await call(cursor ? `${qs}&cursor=${cursor}` : qs);
    pages.push(r);
    cursor = r.body.nextCursor;
  } while (cursor && pages.length < 20);
  return pages;
}

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  V = {};
  for (const t of ["a", "b", "l", "t", "m", "p", "e", "x", "y"]) V[t] = await fx.newVenue(t);
  staff = await fx.newUserWithSession("staff");
  staffB = await fx.newUserWithSession("staffb");
  for (const t of ["a", "l", "t", "m", "p", "e"]) await fx.addMember(staff.id, V[t], "staff");
  await fx.addMember(staffB.id, V.b, "staff");
  const u1 = await fx.newUserWithSession("u1");
  const u2 = await fx.newUserWithSession("u2");
  m1 = await fx.newUserWithSession("m1");
  m2 = await fx.newUserWithSession("m2");

  // A: 7 richieste, giorno 1..7 del 2021-01 (indice 0 = giorno 7 = la più recente); i giorni 2 e 4 sono `expired`
  const cardA = await seedCard(u1.id, V.a);
  const byDay: string[] = [];
  for (let d = 1; d <= 7; d++) byDay.push(await seedReq(cardA, V.a, d === 2 || d === 4 ? "expired" : "rejected", `2021-01-0${d} 12:00+00`));
  A = [...byDay].reverse();
  // B: 3 richieste di u2, giorni 3..5
  const cardB = await seedCard(u2.id, V.b);
  for (const d of [3, 4, 5]) await seedReq(cardB, V.b, "rejected", `2021-01-0${d} 12:00+00`);
  // L: una pendente già scaduta (scadenza lazy)
  const cardL = await seedCard(u1.id, V.l);
  await pool.query(
    `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() - interval '1 minute')`,
    [cardL, V.l],
  );
  // T: tre richieste con lo stesso created_at; M: due a un microsecondo di distanza
  const cardT = await seedCard(u1.id, V.t);
  for (let i = 0; i < 3; i++) await seedReq(cardT, V.t, "rejected", "2021-02-01 12:00:00+00");
  const cardM = await seedCard(u1.id, V.m);
  await seedReq(cardM, V.m, "rejected", "2021-03-01 12:00:00.000001+00");
  await seedReq(cardM, V.m, "rejected", "2021-03-01 12:00:00.000002+00");
  // P: 26 richieste (oltre il default di 25)
  const cardP = await seedCard(u1.id, V.p);
  await pool.query(
    `INSERT INTO stamp_requests (card_id, venue_id, status, created_at, expires_at, resolved_at)
     SELECT $1, $2, 'rejected', '2021-04-01 00:00+00'::timestamptz + (g || ' minutes')::interval,
            '2021-04-01 00:00+00'::timestamptz + (g || ' minutes')::interval + interval '3 minutes', now()
     FROM generate_series(1, 26) g`,
    [cardP, V.p],
  );
  // X e Y: m1 (X giorni 1,3,5; Y giorni 2,4), m2 (X giorno 6)
  const cardX1 = await seedCard(m1.id, V.x);
  const cardY1 = await seedCard(m1.id, V.y);
  const cardX2 = await seedCard(m2.id, V.x);
  A.length; // (A resta com'è)
  global.__mine = {
    x1: await seedReq(cardX1, V.x, "rejected", "2021-05-01 12:00+00"),
    y1: await seedReq(cardY1, V.y, "rejected", "2021-05-02 12:00+00"),
    x2: await seedReq(cardX1, V.x, "rejected", "2021-05-03 12:00+00"),
    y2: await seedReq(cardY1, V.y, "rejected", "2021-05-04 12:00+00"),
    x3: await seedReq(cardX1, V.x, "rejected", "2021-05-05 12:00+00"),
    m2x: await seedReq(cardX2, V.x, "rejected", "2021-05-06 12:00+00"),
  } as any;
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});
declare global {
  // eslint-disable-next-line no-var
  var __mine: Record<string, string>;
}

describe("paginazione dello storico dello staff", () => {
  it("senza parametri: tutte le righe, total 7, pageStart 1, pageEnd 7, nessun cursore", async () => {
    const r = await hist(V.a);
    expect(r.status).toBe(200);
    expect(ids(r)).toEqual(A);
    expect(r.body).toMatchObject({ total: 7, pageStart: 1, pageEnd: 7, prevCursor: null, nextCursor: null });
  });

  it("limit=3: prime 3 righe (le più recenti), total 7, pageStart 1, pageEnd 3, prevCursor null, nextCursor presente", async () => {
    const r = await hist(V.a, "limit=3");
    expect(ids(r)).toEqual(A.slice(0, 3));
    expect(r.body).toMatchObject({ total: 7, pageStart: 1, pageEnd: 3, prevCursor: null });
    expect(r.body.nextCursor).toEqual(expect.any(String));
  });

  it("avanti: pagina 2 (4–6) e pagina 3 con una riga (7–7, nextCursor null)", async () => {
    const p1 = await hist(V.a, "limit=3");
    const p2 = await hist(V.a, `limit=3&cursor=${p1.body.nextCursor}`);
    expect(ids(p2)).toEqual(A.slice(3, 6));
    expect(p2.body).toMatchObject({ total: 7, pageStart: 4, pageEnd: 6 });
    expect(p2.body.prevCursor).toEqual(expect.any(String));
    const p3 = await hist(V.a, `limit=3&cursor=${p2.body.nextCursor}`);
    expect(ids(p3)).toEqual(A.slice(6));
    expect(p3.body).toMatchObject({ pageStart: 7, pageEnd: 7, nextCursor: null });
    expect(p3.body.prevCursor).toEqual(expect.any(String));
  });

  it("indietro: dalla pagina 3 con prevCursor si torna alle righe 4–6 e poi alle 1–3 (prevCursor null)", async () => {
    const p1 = await hist(V.a, "limit=3");
    const p2 = await hist(V.a, `limit=3&cursor=${p1.body.nextCursor}`);
    const p3 = await hist(V.a, `limit=3&cursor=${p2.body.nextCursor}`);
    const back2 = await hist(V.a, `limit=3&cursor=${p3.body.prevCursor}`);
    expect(ids(back2)).toEqual(A.slice(3, 6));
    expect(back2.body).toMatchObject({ pageStart: 4, pageEnd: 6 });
    const back1 = await hist(V.a, `limit=3&cursor=${back2.body.prevCursor}`);
    expect(ids(back1)).toEqual(A.slice(0, 3));
    expect(back1.body).toMatchObject({ pageStart: 1, pageEnd: 3, prevCursor: null });
  });

  it("avanti fino in fondo: le righe concatenate sono tutte e 7, senza duplicati, in ordine decrescente", async () => {
    const pages = await walk((qs) => hist(V.a, qs), "limit=2");
    expect(pages.map((p) => p.body.pageStart)).toEqual([1, 3, 5, 7]);
    expect(pages.flatMap(ids)).toEqual(A);
  });

  it("stesso created_at: il tie-break sull'id decrescente non salta né duplica righe (limit=1)", async () => {
    const pages = await walk((qs) => hist(V.t, qs), "limit=1");
    const got = pages.flatMap(ids);
    const expected = (await pool.query(`SELECT id FROM stamp_requests WHERE venue_id = $1 ORDER BY created_at DESC, id DESC`, [V.t])).rows.map((r) => r.id);
    expect(got).toEqual(expected);
    expect(new Set(got).size).toBe(3);
  });

  it("un microsecondo di differenza: con limit=1 compaiono entrambe, una volta sola e nell'ordine giusto", async () => {
    const pages = await walk((qs) => hist(V.m, qs), "limit=1");
    const expected = (await pool.query(`SELECT id FROM stamp_requests WHERE venue_id = $1 ORDER BY created_at DESC, id DESC`, [V.m])).rows.map((r) => r.id);
    expect(pages.flatMap(ids)).toEqual(expected);
  });

  it.each([["limit=1"], ["limit=100"]])("%s → 200", async (qs) => {
    expect((await hist(V.a, qs)).status).toBe(200);
  });
  it.each([["limit=0"], ["limit=101"], ["limit=abc"], ["limit=1.5"], ["limit="]])("%s → 400", async (qs) => {
    expect((await hist(V.a, qs)).status).toBe(400);
  });

  it("senza limit: pagina da 25 righe (locale con 26), total 26, nextCursor presente", async () => {
    const r = await hist(V.p);
    expect(r.body.requests).toHaveLength(25);
    expect(r.body).toMatchObject({ total: 26, pageStart: 1, pageEnd: 25 });
    expect(r.body.nextCursor).toEqual(expect.any(String));
  });

  it("offset → 400; cursore malformato → 400", async () => {
    expect((await hist(V.a, "offset=0")).status).toBe(400);
    const b64 = (s: string) => Buffer.from(s).toString("base64url");
    const bad = [
      "abc",
      "n.%%%",
      `x.${b64(JSON.stringify(["2021-01-01T00:00:00.000000Z", crypto.randomUUID()]))}`, // direzione sconosciuta
      `n.${b64("non json")}`,
      `n.${b64(JSON.stringify(["non-una-data", crypto.randomUUID()]))}`,
      `n.${b64(JSON.stringify(["2021-01-01T00:00:00.000000Z", "non-un-uuid"]))}`,
    ];
    for (const c of bad) expect((await hist(V.a, `cursor=${c}`)).status).toBe(400);
    expect((await hist(V.a, "cursor=")).status).toBe(400);
  });

  it("con filtri: status=expired dà total e posizioni solo sulle righe filtrate", async () => {
    const r = await hist(V.a, "status=expired&limit=1");
    expect(r.body).toMatchObject({ total: 2, pageStart: 1, pageEnd: 1 });
    const p2 = await hist(V.a, `status=expired&limit=1&cursor=${r.body.nextCursor}`);
    expect(p2.body).toMatchObject({ total: 2, pageStart: 2, pageEnd: 2, nextCursor: null });
    expect([...ids(r), ...ids(p2)]).toEqual([A[3], A[5]]); // giorni 4 e 2
  });

  it("nessuna riga: requests [], total 0, pageStart 0, pageEnd 0, cursori null", async () => {
    const r = await hist(V.e);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ requests: [], total: 0, pageStart: 0, pageEnd: 0, prevCursor: null, nextCursor: null });
  });

  it("isolamento: un cursore del locale A usato su B dà solo righe di B e il total di B; lo staff di B su A resta 403", async () => {
    const a = await hist(V.a, "limit=3");
    const r = await hist(V.b, `cursor=${a.body.nextCursor}`, staffB.token);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    const inB = (await pool.query(`SELECT id FROM stamp_requests WHERE venue_id = $1`, [V.b])).rows.map((x) => x.id);
    for (const id of ids(r)) expect(inB).toContain(id);
    expect((await hist(V.a, "", staffB.token)).status).toBe(403);
  });

  it("scadenza lazy: una pending oltre expires_at conta come expired nel total", async () => {
    const r = await hist(V.l, "status=expired");
    expect(r.body.total).toBe(1);
    expect(r.body.requests[0].status).toBe("expired");
  });

  it("la risposta ha esattamente i campi requests, total, pageStart, pageEnd, prevCursor, nextCursor", async () => {
    const r = await hist(V.a, "limit=2");
    expect(Object.keys(r.body).sort()).toEqual(["nextCursor", "pageEnd", "pageStart", "prevCursor", "requests", "total"]);
  });
});

describe("paginazione dello storico del cliente (GET /requests/mine)", () => {
  it("5 richieste in 2 locali, limit=2: tre pagine (pageStart 1, 3, 5), total 5, e si torna indietro", async () => {
    const { x1, y1, x2, y2, x3 } = global.__mine;
    const pages = await walk((qs) => mine(m1.token, qs), "limit=2");
    expect(pages.map((p) => p.body.pageStart)).toEqual([1, 3, 5]);
    expect(pages.map((p) => p.body.total)).toEqual([5, 5, 5]);
    expect(pages.flatMap(ids)).toEqual([x3, y2, x2, y1, x1]);
    const back = await mine(m1.token, `limit=2&cursor=${pages[2].body.prevCursor}`);
    expect(ids(back)).toEqual(ids(pages[1]));
  });

  it("con venueId (B34) il total e le posizioni valgono solo per quel locale", async () => {
    const { x1, x2, x3 } = global.__mine;
    const p1 = await mine(m1.token, `venueId=${V.x}&limit=2`);
    expect(p1.body).toMatchObject({ total: 3, pageStart: 1, pageEnd: 2 });
    expect(ids(p1)).toEqual([x3, x2]);
    const p2 = await mine(m1.token, `venueId=${V.x}&limit=2&cursor=${p1.body.nextCursor}`);
    expect(ids(p2)).toEqual([x1]);
    expect(p2.body).toMatchObject({ pageStart: 3, pageEnd: 3, nextCursor: null });
  });

  it("un altro cliente non vede né conta le richieste del primo, nemmeno con il suo cursore", async () => {
    // cursore `p` dell'ultima pagina di m1 (bordo: la sua riga più vecchia): per m2 vale come semplice posizione
    const pages = await walk((qs) => mine(m1.token, qs), "limit=2");
    const r = await mine(m2.token, `cursor=${pages[2].body.prevCursor}`);
    expect(r.body.total).toBe(1);
    expect(ids(r)).toEqual([global.__mine.m2x]);
  });

  it("le righe mantengono displayName, reward e venueName (B39, B33)", async () => {
    const row = (await mine(m1.token, "limit=1")).body.requests[0];
    expect(row).toHaveProperty("displayName");
    expect(row).toHaveProperty("reward", null);
    expect(row.venueName).toEqual(expect.any(String));
  });
});
