/**
 * B39: nome del cliente (`displayName`) nella coda dello staff e nei due storici
 * (`GET /venues/:venueId/requests`, `.../requests/history`, `GET /requests/mine`).
 * Mai l'email; utente anonimizzato o senza nome → `displayName: null`.
 *
 * Tocca il DB del worktree: crea propri locali e utenti `cname-test-*` e li elimina in afterAll.
 * L'aggiornamento del pass Google è sostituito da un finto.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("cname-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let staffA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffB: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let named: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let unnamed: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let anon: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let other: Awaited<ReturnType<typeof fx.newUserWithSession>>; // cliente solo del locale B
let rid: { named: string; unnamed: string; anon: string; other: string };
let hist: { approved: string; rejected: string; expired: string }; // richieste del cliente "history" nel locale A
let histUser: Awaited<ReturnType<typeof fx.newUserWithSession>>;

vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);

const queue = (venue: string, cookie?: string) => request(baseUrl, `/api/venues/${venue}/requests`, { cookie });
const history = (venue: string, cookie?: string) => request(baseUrl, `/api/venues/${venue}/requests/history`, { cookie });
const mine = (cookie: string) => request(baseUrl, `/api/requests/mine`, { cookie });
const rowOf = (res: { body: any }, id: string) => res.body.requests.find((x: any) => x.requestId === id);

/** Primo tocco (crea la card) + richiesta di timbro: restituisce l'id della richiesta pending. */
async function newPending(venue: string, cookie: string): Promise<string> {
  await request(baseUrl, `/api/venues/${venue}/visit`, { method: "POST", cookie });
  const v = await request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
  return v.body.requestId as string;
}
const confirm = (venue: string, id: string, cookie: string, stamps: number) =>
  request(baseUrl, `/api/venues/${venue}/requests/${id}/confirm`, { method: "POST", cookie, body: { stamps } });
const reject = (venue: string, id: string, cookie: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/${id}/reject`, { method: "POST", cookie });

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a");
  venueB = await fx.newVenue("b");
  staffA = await fx.newUserWithSession("staff-a");
  staffB = await fx.newUserWithSession("staff-b");
  await fx.addMember(staffA.id, venueA, "staff");
  await fx.addMember(staffB.id, venueB, "staff");
  named = await fx.newUserWithSession("named", { displayName: "Mario Rossi" });
  unnamed = await fx.newUserWithSession("unnamed", { displayName: null });
  anon = await fx.newUserWithSession("anon", { displayName: "Da Cancellare" });
  other = await fx.newUserWithSession("other", { displayName: "Altro Cliente" });
  histUser = await fx.newUserWithSession("hist", { displayName: "Luisa Verdi" });

  rid = {
    named: await newPending(venueA, named.token),
    unnamed: await newPending(venueA, unnamed.token),
    anon: await newPending(venueA, anon.token),
    other: await newPending(venueB, other.token),
  };
  // anonimizzazione come fa l'app: nome azzerato e `anonymized_at` (l'email resta solo per la pulizia dei test)
  await pool.query(`UPDATE users SET display_name = NULL, anonymized_at = now() WHERE id = $1`, [anon.id]);

  // storico di histUser nel locale A: approved, rejected, expired
  const approved = await newPending(venueA, histUser.token);
  await confirm(venueA, approved, staffA.token, 3);
  const rejected = await newPending(venueA, histUser.token);
  await reject(venueA, rejected, staffA.token);
  const expired = await newPending(venueA, histUser.token);
  await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [expired]);
  hist = { approved, rejected, expired };
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/venues/:venueId/requests (coda): nome del cliente", () => {
  it("ogni riga porta displayName con il nome del cliente, senza email", async () => {
    const r = await queue(venueA, staffA.token);
    expect(r.status).toBe(200);
    expect(rowOf(r, rid.named).displayName).toBe("Mario Rossi");
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });

  it("la riga ha esattamente i campi attesi (displayName compreso, nessun id utente)", async () => {
    const r = await queue(venueA, staffA.token);
    expect(Object.keys(rowOf(r, rid.named)).sort()).toEqual(
      ["createdAt", "displayName", "expiresAt", "promotionChanged", "publicCode", "requestId", "stampsCount", "stampsRequired"].sort(),
    );
  });

  it("utente anonimizzato → displayName null", async () => {
    const r = await queue(venueA, staffA.token);
    expect(rowOf(r, rid.anon)).toBeDefined();
    expect(rowOf(r, rid.anon).displayName).toBeNull();
  });

  it("nome mai impostato → displayName null", async () => {
    const r = await queue(venueA, staffA.token);
    expect(rowOf(r, rid.unnamed).displayName).toBeNull();
  });

  it("nessun nome di clienti di un altro locale; chi non è membro resta 403", async () => {
    const inA = await queue(venueA, staffA.token);
    expect(JSON.stringify(inA.body)).not.toContain("Altro Cliente");
    expect(rowOf(inA, rid.other)).toBeUndefined();
    const inB = await queue(venueB, staffB.token);
    expect(rowOf(inB, rid.other).displayName).toBe("Altro Cliente");
    expect((await queue(venueB, staffA.token)).status).toBe(403);
  });
});

describe("GET /api/venues/:venueId/requests/history: nome del cliente", () => {
  it("ogni riga porta displayName, per approved, rejected ed expired", async () => {
    const r = await history(venueA, staffA.token);
    expect(r.status).toBe(200);
    for (const id of [hist.approved, hist.rejected, hist.expired]) {
      expect(rowOf(r, id).displayName).toBe("Luisa Verdi");
    }
    expect(rowOf(r, hist.approved).status).toBe("approved");
    expect(rowOf(r, hist.rejected).status).toBe("rejected");
    expect(rowOf(r, hist.expired).status).toBe("expired");
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });

  it("utente anonimizzato e utente senza nome → null", async () => {
    const r = await history(venueA, staffA.token);
    expect(rowOf(r, rid.anon).displayName).toBeNull();
    expect(rowOf(r, rid.unnamed).displayName).toBeNull();
  });

  it("isolamento: lo storico di B non contiene i nomi dei clienti di A", async () => {
    const r = await history(venueB, staffB.token);
    const text = JSON.stringify(r.body);
    expect(text).not.toContain("Mario Rossi");
    expect(text).not.toContain("Luisa Verdi");
    expect(rowOf(r, rid.other).displayName).toBe("Altro Cliente");
    expect((await history(venueA, staffB.token)).status).toBe(403);
  });

  it("la riga ha esattamente i campi attesi (displayName compreso, nessun id utente)", async () => {
    const r = await history(venueA, staffA.token);
    expect(Object.keys(rowOf(r, hist.approved)).sort()).toEqual(
      ["createdAt", "displayName", "publicCode", "requestId", "resolvedAt", "stamps", "stampsAdded", "reward", "rewardsRedeemed", "status"].sort(),
    );
  });
});

describe("GET /api/requests/mine: nome del cliente", () => {
  it("le righe dello storico del cliente portano displayName", async () => {
    const r = await mine(histUser.token);
    expect(r.status).toBe(200);
    expect(r.body.requests.length).toBe(3);
    for (const row of r.body.requests) expect(row.displayName).toBe("Luisa Verdi");
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });
});
