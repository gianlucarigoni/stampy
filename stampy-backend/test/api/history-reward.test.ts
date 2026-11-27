/**
 * B33: nome del premio (`reward`) nei due storici (staff e cliente) per le richieste `approved`
 * con premio consumato; `null` altrimenti. Mai nella coda (D29).
 *
 * Tocca il DB del worktree: crea propri locali e utenti `reward-test-*` e li elimina in afterAll.
 * L'aggiornamento del pass Google è sostituito da un finto.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("reward-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string; // premio "Pizza margherita"
let venueB: string; // premio "Premio nuovo"; i clienti con card ferma su "Premio vecchio"
let venueC: string; // premio "Premio A", poi cambiato in "Premio B"
let venueD: string; // premio "Dolce della casa"
let staffA: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffB: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffC: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let staffD: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let ids: Record<string, string>;
vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);

const history = (venue: string, cookie: string) => request(baseUrl, `/api/venues/${venue}/requests/history`, { cookie });
const queue = (venue: string, cookie: string) => request(baseUrl, `/api/venues/${venue}/requests`, { cookie });
const mine = (cookie: string) => request(baseUrl, `/api/requests/mine`, { cookie });
const rowOf = (res: { body: any }, id: string) => res.body.requests.find((x: any) => x.requestId === id);
const confirm = (venue: string, id: string, cookie: string, stamps: number) =>
  request(baseUrl, `/api/venues/${venue}/requests/${id}/confirm`, { method: "POST", cookie, body: { stamps } });

/** Primo tocco (crea la card) + richiesta di timbro: restituisce l'id della richiesta pending. */
async function newPending(venue: string, cookie: string): Promise<string> {
  await request(baseUrl, `/api/venues/${venue}/visit`, { method: "POST", cookie });
  const v = await request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie });
  return v.body.requestId as string;
}
/** Nuova richiesta su una card già esistente. */
const nextPending = async (venue: string, cookie: string) =>
  (await request(baseUrl, `/api/venues/${venue}/visit?requestStamp=1`, { method: "POST", cookie })).body.requestId as string;

async function staleCard(userId: string, venue: string) {
  const oldPromo = await fx.newOldPromotion(venue);
  const code = `R${Math.random().toString(36).slice(2, 9).toUpperCase()}`.slice(0, 8);
  const cardId: string = (
    await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
       VALUES ($1, $2, $3, 3, $4, 'google', $5, 'active') RETURNING id`,
      [userId, venue, oldPromo, code, `test.${userId}`],
    )
  ).rows[0].id;
  return (
    await pool.query(
      `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() + interval '3 minutes') RETURNING id`,
      [cardId, venue],
    )
  ).rows[0].id as string;
}

let c1: Awaited<ReturnType<typeof fx.newUserWithSession>>; // venueA: premio, senza premio, rejected, expired
let c2: Awaited<ReturnType<typeof fx.newUserWithSession>>; // card piena poi 1 prodotto (venueA)
let c3: Awaited<ReturnType<typeof fx.newUserWithSession>>; // venueC, premio prima del cambio
let c4: Awaited<ReturnType<typeof fx.newUserWithSession>>; // card su promozione vecchia (venueB)
let c5: Awaited<ReturnType<typeof fx.newUserWithSession>>; // premi in venueA e venueD

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a", { reward: "Pizza margherita" });
  venueB = await fx.newVenue("b", { reward: "Premio nuovo" });
  venueC = await fx.newVenue("c", { reward: "Premio A" });
  venueD = await fx.newVenue("d", { reward: "Dolce della casa" });
  staffA = await fx.newUserWithSession("staff-a");
  staffB = await fx.newUserWithSession("staff-b");
  staffC = await fx.newUserWithSession("staff-c");
  staffD = await fx.newUserWithSession("staff-d");
  await fx.addMember(staffA.id, venueA, "staff");
  await fx.addMember(staffB.id, venueB, "staff");
  await fx.addMember(staffC.id, venueC, "staff");
  await fx.addMember(staffD.id, venueD, "staff");
  [c1, c2, c3, c4, c5] = await Promise.all(["c1", "c2", "c3", "c4", "c5"].map((t) => fx.newUserWithSession(t)));
  ids = {};

  // c1: approved con premio (11 da 0 → stamp 10, redeem 1), approved senza premio, rejected, expired
  ids.prize = await newPending(venueA, c1.token);
  await confirm(venueA, ids.prize, staffA.token, 11);
  ids.noPrize = await nextPending(venueA, c1.token);
  await confirm(venueA, ids.noPrize, staffA.token, 3);
  ids.rejected = await nextPending(venueA, c1.token);
  await request(baseUrl, `/api/venues/${venueA}/requests/${ids.rejected}/reject`, { method: "POST", cookie: staffA.token });
  ids.expired = await nextPending(venueA, c1.token);
  await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [ids.expired]);

  // c2: card piena (10/10, nessun premio), poi un prodotto = premio
  ids.fullCard = await newPending(venueA, c2.token);
  await confirm(venueA, ids.fullCard, staffA.token, 10);
  ids.fullPrize = await nextPending(venueA, c2.token);
  await confirm(venueA, ids.fullPrize, staffA.token, 1);
  // ancora una richiesta pending su card piena (per la coda)
  ids.queued = await nextPending(venueA, c2.token);

  // c3: premio nel locale C, poi il locale cambia promozione
  ids.beforeChange = await newPending(venueC, c3.token);
  await confirm(venueC, ids.beforeChange, staffC.token, 11);
  await fx.replaceActivePromotion(venueC, "Premio B");

  // c4: card ferma sulla promozione vecchia di B; la conferma fa ripartire da 0 sulla nuova e dà un premio
  ids.stale = await staleCard(c4.id, venueB);
  await confirm(venueB, ids.stale, staffB.token, 11);

  // c5: un premio in A e uno in D
  ids.c5a = await newPending(venueA, c5.token);
  await confirm(venueA, ids.c5a, staffA.token, 11);
  ids.c5d = await newPending(venueD, c5.token);
  await confirm(venueD, ids.c5d, staffD.token, 11);
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("storico dello staff: nome del premio", () => {
  it("approved con premio consumato → reward è il nome del premio", async () => {
    const row = rowOf(await history(venueA, staffA.token), ids.prize);
    expect(row.status).toBe("approved");
    expect(row.rewardsRedeemed).toBe(1);
    expect(row.reward).toBe("Pizza margherita");
  });

  it("approved senza premio → reward null", async () => {
    const row = rowOf(await history(venueA, staffA.token), ids.noPrize);
    expect(row.rewardsRedeemed).toBe(0);
    expect(row.reward).toBeNull();
  });

  it("rejected ed expired → reward null (il campo c'è sempre)", async () => {
    const r = await history(venueA, staffA.token);
    for (const id of [ids.rejected, ids.expired]) {
      const row = rowOf(r, id);
      expect(row).toHaveProperty("reward", null);
    }
    expect(rowOf(r, ids.rejected).status).toBe("rejected");
    expect(rowOf(r, ids.expired).status).toBe("expired");
  });

  it("card piena: il prodotto successivo è il premio; la conferma che riempie la card no", async () => {
    const r = await history(venueA, staffA.token);
    expect(rowOf(r, ids.fullCard).rewardsRedeemed).toBe(0);
    expect(rowOf(r, ids.fullCard).reward).toBeNull();
    expect(rowOf(r, ids.fullPrize).rewardsRedeemed).toBe(1);
    expect(rowOf(r, ids.fullPrize).reward).toBe("Pizza margherita");
  });

  it("promozione cambiata dopo la conferma: lo storico mantiene il nome di allora", async () => {
    const row = rowOf(await history(venueC, staffC.token), ids.beforeChange);
    expect(row.reward).toBe("Premio A");
    const active = (await pool.query(`SELECT config->>'reward' AS r FROM promotions WHERE venue_id = $1 AND ends_at IS NULL`, [venueC])).rows[0].r;
    expect(active).toBe("Premio B");
  });

  it("card su promozione vecchia: il premio è quello della promozione attiva alla conferma", async () => {
    const row = rowOf(await history(venueB, staffB.token), ids.stale);
    expect(row.rewardsRedeemed).toBe(1);
    expect(row.reward).toBe("Premio nuovo");
  });

  it("isolamento: nessun nome di premio di un altro locale", async () => {
    const r = await history(venueD, staffD.token);
    expect(JSON.stringify(r.body)).not.toContain("Pizza margherita");
    expect(rowOf(r, ids.c5d).reward).toBe("Dolce della casa");
    expect((await history(venueA, staffD.token)).status).toBe(403);
  });
});

describe("storico del cliente (GET /requests/mine): nome del premio", () => {
  it("le righe del cliente portano reward del proprio locale, con venueName, e solo le sue", async () => {
    const r = await mine(c5.token);
    expect(r.status).toBe(200);
    expect(r.body.requests).toHaveLength(2);
    expect(rowOf(r, ids.c5a)).toMatchObject({ reward: "Pizza margherita", rewardsRedeemed: 1 });
    expect(rowOf(r, ids.c5d)).toMatchObject({ reward: "Dolce della casa", rewardsRedeemed: 1 });
    expect(rowOf(r, ids.c5a).venueName).toBeDefined();
    expect(JSON.stringify(r.body)).not.toContain("@test.it");
  });
});

describe("coda: nessun nome del premio (D29)", () => {
  it("le righe della coda non hanno il campo reward né il nome del premio", async () => {
    const r = await queue(venueA, staffA.token);
    const row = rowOf(r, ids.queued);
    expect(row).toBeDefined();
    expect(row.stampsCount).toBe(0); // card appena riempita e poi premiata: 0/10
    expect(row).not.toHaveProperty("reward");
    expect(JSON.stringify(r.body)).not.toContain("Pizza margherita");
  });
});
