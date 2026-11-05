/**
 * Storico richieste: GET /api/venues/:venueId/requests/history (staff) e GET /api/requests/mine (cliente);
 * il polling del cliente porta anche `publicCode`.
 *
 * Tocca il DB di sviluppo: crea due propri locali e 4 richieste del locale A datate 2020
 * (approvata 3 timbri, approvata 12, rifiutata, scaduta), così gli intervalli di date non
 * collidono con altri dati; le asserzioni guardano solo quelle 4 richieste. Dati
 * `history-test-*@test.it`, eliminati in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("history-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let staff: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffB: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let outsider: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let customers: Awaited<ReturnType<typeof fx.newUserWithSession>>[];
let reqIds: string[];
let codes: Record<string, string>;

const WINDOW = "from=2020-01-01&to=2020-12-31";
const history = (venue: string, qs: string, cookie?: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/history${qs ? "?" + qs : ""}`, { cookie });
const mineOf = (c: { token: string }, qs = "") => request(baseUrl, `/api/requests/mine${qs ? "?" + qs : ""}`, { cookie: c.token });
const seeded = (r: Res): any[] => (r.body?.requests ?? []).filter((x: any) => reqIds.includes(x.requestId));
/** Indici (0..3) delle richieste seminate presenti nella risposta. */
const idx = (r: Res) => seeded(r).map((x) => reqIds.indexOf(x.requestId)).sort().join();
const codeOf = (i: number) => codes[reqIds[i]];

beforeAll(async () => {
  vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a", { stampsRequired: 10 });
  venueB = await fx.newVenue("b", { stampsRequired: 5 });
  staff = await fx.newUserWithSession("staff");
  staffB = await fx.newUserWithSession("staffb");
  outsider = await fx.newUserWithSession("outsider");
  customers = [];
  for (const t of ["c1", "c2", "c3", "c4"]) customers.push(await fx.newUserWithSession(t));
  await fx.addMember(staff.id, venueA, "staff");
  await fx.addMember(staffB.id, venueB, "staff");

  // seed: apro, risolvo, poi retrodato
  reqIds = [];
  for (const c of customers) {
    await request(baseUrl, `/api/venues/${venueA}/visit`, { method: "POST", cookie: c.token }); // il primo tocco crea la card
    const v = await request(baseUrl, `/api/venues/${venueA}/visit?requestStamp=1`, { method: "POST", cookie: c.token });
    reqIds.push(v.body.requestId);
  }
  const confirm = (i: number, n: number) =>
    request(baseUrl, `/api/venues/${venueA}/requests/${reqIds[i]}/confirm`, { method: "POST", cookie: staff.token, body: { stamps: n } });
  await confirm(0, 3);
  await confirm(1, 12);
  await request(baseUrl, `/api/venues/${venueA}/requests/${reqIds[2]}/reject`, { method: "POST", cookie: staff.token });
  // la quarta resta pending: lo storico deve mostrarla expired
  await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [reqIds[3]]);
  const dates = ["2020-01-10 12:00+00", "2020-02-10 12:00+00", "2020-03-10 12:00+00", "2020-04-10 12:00+00"];
  for (let i = 0; i < 4; i++) await pool.query(`UPDATE stamp_requests SET created_at = $2 WHERE id = $1`, [reqIds[i], dates[i]]);
  const rows = (
    await pool.query(`SELECT r.id, c.public_code FROM stamp_requests r JOIN cards c ON c.id = r.card_id WHERE r.id = ANY($1)`, [reqIds])
  ).rows;
  codes = Object.fromEntries(rows.map((r) => [r.id, r.public_code]));
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/venues/:venueId/requests/history", () => {
  describe("autorizzazione e forma", () => {
    it("401 senza sessione, 403 per un non membro e per lo staff di un altro locale", async () => {
      expect((await history(venueA, "")).status).toBe(401);
      expect((await history(venueA, "", outsider.token)).status).toBe(403);
      expect((await history(venueA, "", staffB.token)).status).toBe(403);
    });

    it("senza filtri: 200, campi mappati esatti, nessuna email, solo { requests }, dalla più recente", async () => {
      const r = await history(venueA, "", staff.token);
      const row = r.body.requests[0];
      expect(r.status).toBe(200);
      expect(Object.keys(row).sort()).toEqual(["createdAt", "publicCode", "requestId", "resolvedAt", "rewardsRedeemed", "stamps", "stampsAdded", "status"]);
      expect(JSON.stringify(r.body)).not.toMatch(/@test\.it|email/i);
      expect(Object.keys(r.body)).toEqual(["requests"]);
      expect(r.body.requests.every((x: any, i: number, a: any[]) => i === 0 || a[i - 1].createdAt >= x.createdAt)).toBe(true);
    });

    it("contenuto delle 4 richieste seminate", async () => {
      const r = await history(venueA, WINDOW, staff.token);
      const by = (i: number) => seeded(r).find((x) => x.requestId === reqIds[i]);

      expect(r.body.requests).toHaveLength(4);
      expect(by(0)).toMatchObject({ status: "approved", stamps: 3, publicCode: codeOf(0) });
      expect(by(1).stamps).toBe(12);
      expect(by(1).stampsAdded + by(1).rewardsRedeemed).toBeLessThanOrEqual(12);
      expect(by(1).stampsAdded).toBeGreaterThanOrEqual(1);
      expect(by(2)).toMatchObject({ status: "rejected", stamps: null, stampsAdded: null, rewardsRedeemed: null });
      expect(by(3).status).toBe("expired"); // scadenza lazy
      expect(r.body.requests.map((x: any) => x.requestId)).toEqual([3, 2, 1, 0].map((i) => reqIds[i]));
    });

    it("lo storico non oscura le route confirm/reject e la coda funziona ancora", async () => {
      const q = await request(baseUrl, `/api/venues/${venueA}/requests`, { cookie: staff.token });
      expect(q.status).toBe(200);
      expect(Array.isArray(q.body.requests)).toBe(true);
    });

    it("isolamento tra locali: lo staff del locale B non vede nessuna delle richieste di A", async () => {
      const r = await history(venueB, WINDOW, staffB.token);
      expect(r.status).toBe(200);
      expect(seeded(r)).toHaveLength(0);
    });
  });

  describe("filtro per stato", () => {
    it.each([
      ["approved", "0,1"],
      ["rejected", "2"],
      ["expired", "3"],
    ])("status=%s → %s", async (status, expected) => {
      expect(idx(await history(venueA, `status=${status}&${WINDOW}`, staff.token))).toBe(expected);
    });

    it("stato non valido → 400", async () => {
      expect((await history(venueA, "status=bogus", staff.token)).status).toBe(400);
    });
  });

  describe("filtro per timbri confermati (solo approved)", () => {
    it.each([
      ["minStamps=5", "1"],
      ["maxStamps=5", "0"],
      ["minStamps=3&maxStamps=12", "0,1"],
      ["minStamps=3&maxStamps=3", "0"],
      ["minStamps=13", ""],
    ])("%s → [%s]", async (qs, expected) => {
      expect(idx(await history(venueA, `${qs}&${WINDOW}`, staff.token))).toBe(expected);
    });

    it.each([["minStamps=0"], ["maxStamps=51"], ["minStamps=abc"]])("%s → 400", async (qs) => {
      expect((await history(venueA, qs, staff.token)).status).toBe(400);
    });
  });

  describe("filtro per date", () => {
    it.each([
      ["from=2020-02-10&to=2020-12-31", "1,2,3", "from incluso"],
      ["from=2020-02-11", "2,3", "solo from"],
      ["to=2020-02-10&from=2019-01-01", "0,1", "to solo data = fine di quel giorno"],
      ["to=2020-01-31", "0", "solo to"],
      ["from=2020-02-01&to=2020-03-31", "1,2", "entrambi"],
      ["from=2020-02-10T12:00:01Z&to=2020-03-10T12:00:00Z", "2", "istanti ISO completi"],
    ])("%s → [%s] (%s)", async (qs, expected) => {
      const r = await history(venueA, qs, staff.token);
      expect(r.status).toBe(200);
      expect(idx(r)).toBe(expected);
    });

    it("nessuna data → 200 (nessun limite implicito)", async () => {
      expect((await history(venueA, "", staff.token)).status).toBe(200);
    });

    it.each([
      ["from=not-a-date"],
      ["to=2020-13-45"],
      ["from=2020-12-01&to=2020-01-01"],
      ["from=2020-03-10T12:00:01Z&to=2020-03-10T12:00:00Z"],
    ])("%s → 400", async (qs) => {
      expect((await history(venueA, qs, staff.token)).status).toBe(400);
    });

    it("from == to (stesso giorno) → 200", async () => {
      expect((await history(venueA, "from=2020-02-10&to=2020-02-10", staff.token)).status).toBe(200);
    });
  });

  describe("combinazione dei filtri e niente paginazione", () => {
    it("approved + min 5 + febbraio → solo la numero 1", async () => {
      expect(idx(await history(venueA, "status=approved&minStamps=5&from=2020-02-01&to=2020-02-28", staff.token))).toBe("1");
    });

    it("l'elenco completo contiene ogni riga del locale, senza tetto", async () => {
      const all = await history(venueA, "", staff.token);
      const total = (await pool.query(`SELECT count(*)::int AS n FROM stamp_requests WHERE venue_id = $1`, [venueA])).rows[0].n;
      expect(all.body.requests).toHaveLength(total);
    });

    it.each([["limit=2"], ["offset=0"], ["minProducts=1"], ["maxProducts=1"], ["foo=1"]])(
      "parametro non ammesso (%s) → 400",
      async (qs) => {
        expect((await history(venueA, qs, staff.token)).status).toBe(400);
      },
    );
  });
});

describe("GET /api/requests/mine (storico del cliente)", () => {
  it("401 senza sessione", async () => {
    expect((await request(baseUrl, "/api/requests/mine")).status).toBe(401);
  });

  it("solo le richieste proprie, con i campi dello staff più venueName, senza email", async () => {
    const nameA = (await pool.query(`SELECT name FROM venues WHERE id = $1`, [venueA])).rows[0].name;
    const r = await mineOf(customers[0], WINDOW);
    const row = seeded(r)[0];

    expect(r.status).toBe(200);
    expect(r.body.requests).toHaveLength(1);
    expect(Object.keys(row).sort()).toEqual(["createdAt", "publicCode", "requestId", "resolvedAt", "rewardsRedeemed", "stamps", "stampsAdded", "status", "venueName"]);
    expect(row).toMatchObject({ venueName: nameA, publicCode: codeOf(0), status: "approved", stamps: 3 });
    expect(JSON.stringify(r.body)).not.toMatch(/@test\.it|email/i);
    expect(Object.keys(r.body)).toEqual(["requests"]);
  });

  it("isolamento: il cliente 2 non vede mai la richiesta del cliente 1", async () => {
    expect(idx(await mineOf(customers[1], WINDOW))).toBe("1");
  });

  it("i filtri valgono anche per il cliente (stato, timbri, date)", async () => {
    expect(idx(await mineOf(customers[2], `status=rejected&${WINDOW}`))).toBe("2");
    expect(seeded(await mineOf(customers[0], `status=rejected&${WINDOW}`))).toHaveLength(0);
    expect(idx(await mineOf(customers[1], `minStamps=5&${WINDOW}`))).toBe("1");
    expect(seeded(await mineOf(customers[1], `maxStamps=5&${WINDOW}`))).toHaveLength(0);
    expect(seeded(await mineOf(customers[0], "from=2020-02-01&to=2020-12-31"))).toHaveLength(0);
  });

  it("scadenza lazy: la pending oltre expires_at del cliente 4 appare expired", async () => {
    expect(seeded(await mineOf(customers[3], WINDOW))[0].status).toBe("expired");
  });

  it("attraversa i locali: dopo un tocco anche su B compaiono entrambi i nomi", async () => {
    const c = customers[0];
    await request(baseUrl, `/api/venues/${venueB}/visit`, { method: "POST", cookie: c.token });
    await request(baseUrl, `/api/venues/${venueB}/visit?requestStamp=1`, { method: "POST", cookie: c.token });
    const nameA = (await pool.query(`SELECT name FROM venues WHERE id = $1`, [venueA])).rows[0].name;
    const nameB = (await pool.query(`SELECT name FROM venues WHERE id = $1`, [venueB])).rows[0].name;

    const names = new Set((await mineOf(c)).body.requests.map((x: any) => x.venueName));
    expect(names.has(nameA)).toBe(true);
    expect(names.has(nameB)).toBe(true);
  });

  it.each([["status=bogus"], ["limit=2"], ["foo=1"]])("parametro non ammesso (%s) → 400", async (qs) => {
    expect((await mineOf(customers[0], qs)).status).toBe(400);
  });

  it("la route fissa /mine non oscura /api/requests/:id", async () => {
    expect((await request(baseUrl, `/api/requests/${reqIds[0]}`, { cookie: customers[0].token })).status).toBe(200);
  });
});

describe("polling del cliente con publicCode", () => {
  it("c'è anche dopo l'approvazione e il rifiuto; la richiesta di un altro resta 404", async () => {
    const a = await request(baseUrl, `/api/requests/${reqIds[0]}`, { cookie: customers[0].token });
    const b = await request(baseUrl, `/api/requests/${reqIds[2]}`, { cookie: customers[2].token });
    const foreign = await request(baseUrl, `/api/requests/${reqIds[0]}`, { cookie: customers[1].token });

    expect(a.body.publicCode).toBe(codeOf(0));
    expect(b.body.publicCode).toBe(codeOf(2));
    expect(foreign.status).toBe(404);
  });
});
