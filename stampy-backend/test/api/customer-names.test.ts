/**
 * B31: `visit` e `GET /requests/:id` restituiscono `venueName` e `rewardName` (nome del premio)
 * già prima dell'approvazione. `reward` resta solo nel polling `approved`.
 *
 * Tocca il DB del worktree: crea propri locali, utenti e sessioni `names-test-*` e li elimina in afterAll.
 * L'aggiornamento del pass Google è sostituito da un finto.
 */
import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import requestSrv from "../../src/api/requests/requests.service";
import walletSrv from "../../src/api/wallet/wallet.service";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("names-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string; // premio "Pizza margherita"
let venueB: string; // premio "Premio nuovo", card su promozione vecchia ("Premio vecchio")
let staff: Awaited<ReturnType<typeof fx.newUserWithSession>>;
vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);

const visit = (venue: string, cookie?: string, query = "?requestStamp=1") =>
  request(baseUrl, `/api/venues/${venue}/visit${query}`, { method: "POST", cookie });
const poll = (requestId: string, cookie?: string) => request(baseUrl, `/api/requests/${requestId}`, { cookie });
const confirm = (venue: string, requestId: string, stamps: number) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/confirm`, { method: "POST", cookie: staff.token, body: { stamps } });
const reject = (venue: string, requestId: string) =>
  request(baseUrl, `/api/venues/${venue}/requests/${requestId}/reject`, { method: "POST", cookie: staff.token });
const venueNameOf = async (venue: string) => (await pool.query(`SELECT name FROM venues WHERE id = $1`, [venue])).rows[0].name as string;

/** Card ferma sulla promozione VECCHIA di venueB, con una richiesta pending. */
async function staleCustomer(tag: string, o: { pending?: boolean } = {}) {
  const u = await fx.newUserWithSession(tag);
  const oldPromo = await fx.newOldPromotion(venueB).catch(async () => (await pool.query(
    `SELECT id FROM promotions WHERE venue_id = $1 AND name = 'Vecchia promozione'`, [venueB])).rows[0].id as string);
  const code = `N${Math.random().toString(36).slice(2, 9).toUpperCase()}`.slice(0, 8);
  const cardId: string = (
    await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
       VALUES ($1, $2, $3, 3, $4, 'google', $5, 'active') RETURNING id`,
      [u.id, venueB, oldPromo, code, `test.${u.id}`],
    )
  ).rows[0].id;
  let requestId = "";
  if (o.pending !== false) {
    requestId = (
      await pool.query(
        `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() + interval '3 minutes') RETURNING id`,
        [cardId, venueB],
      )
    ).rows[0].id as string;
  }
  return { ...u, cardId, requestId };
}

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a", { reward: "Pizza margherita" });
  venueB = await fx.newVenue("b", { stampsRequired: 6, reward: "Premio nuovo" });
  staff = await fx.newUserWithSession("staff");
  await fx.addMember(staff.id, venueA, "staff");
  await fx.addMember(staff.id, venueB, "staff");
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("visit: nome del locale e del premio", () => {
  it("primo tocco → 201 card_created con venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("v1");
    const r = await visit(venueA, u.token);
    expect(r.status).toBe(201);
    expect(r.body.state).toBe("card_created");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
  });

  it("card not_added e semplice tocco → 200 card_not_added con venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("v2");
    await visit(venueA, u.token, "");
    const r = await visit(venueA, u.token, "");
    expect(r.status).toBe(200);
    expect(r.body.state).toBe("card_not_added");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
  });

  it("nuova richiesta (requestStamp=1) → 201 request_pending con venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("v3");
    await visit(venueA, u.token);
    const r = await visit(venueA, u.token);
    expect(r.status).toBe(201);
    expect(r.body.state).toBe("request_pending");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
  });

  it("richiesta già pending → 200 request_pending con gli stessi venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("v4");
    await visit(venueA, u.token);
    const first = await visit(venueA, u.token);
    const again = await visit(venueA, u.token);
    expect(again.status).toBe(200);
    expect(again.body.requestId).toBe(first.body.requestId);
    expect(again.body.venueName).toBe(first.body.venueName);
    expect(again.body.rewardName).toBe("Pizza margherita");
  });

  describe("race su newRequest", () => {
    afterEach(() => vi.restoreAllMocks());
    it("newRequest perde la race e la pendente del vincitore esiste → 200 con venueName e rewardName", async () => {
      vi.spyOn(walletSrv, "updateCard").mockResolvedValue(undefined as any);
      const u = await fx.newUserWithSession("v5");
      await visit(venueA, u.token, "");
      const cardId = (await pool.query(`SELECT id FROM cards WHERE user_id = $1`, [u.id])).rows[0].id;
      await pool.query(
        `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at) VALUES ($1, $2, 'pending', now() + interval '3 minutes')`,
        [cardId, venueA],
      );
      vi.spyOn(requestSrv, "getPendingRequest").mockResolvedValueOnce(null);
      vi.spyOn(requestSrv, "newRequest").mockResolvedValue(null);
      const r = await visit(venueA, u.token);
      expect(r.status).toBe(200);
      expect(r.body.venueName).toBe(await venueNameOf(venueA));
      expect(r.body.rewardName).toBe("Pizza margherita");
    });
  });

  it("card su promozione vecchia → rewardName è il premio della promozione attiva", async () => {
    const c = await staleCustomer("v6", { pending: false });
    const r = await visit(venueB, c.token);
    expect(r.body.promotionChanged).toBe(true);
    expect(r.body.rewardName).toBe("Premio nuovo");
    expect(r.body.venueName).toBe(await venueNameOf(venueB));
  });
});

describe("polling: nome del locale e del premio in ogni stato", () => {
  it("pending → venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("p1");
    await visit(venueA, u.token);
    const { body: v } = await visit(venueA, u.token);
    const r = await poll(v.requestId, u.token);
    expect(r.body.status).toBe("pending");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
    expect(r.body).not.toHaveProperty("reward");
  });

  it("approved → rewardName presente e uguale a reward; stampsAdded e rewardsRedeemed invariati", async () => {
    const u = await fx.newUserWithSession("p2");
    await visit(venueA, u.token);
    const { body: v } = await visit(venueA, u.token);
    expect((await confirm(venueA, v.requestId, 3)).status).toBe(200);
    const r = await poll(v.requestId, u.token);
    expect(r.body.status).toBe("approved");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
    expect(r.body.reward).toBe(r.body.rewardName);
    expect(r.body.stampsAdded).toBe(3);
    expect(r.body.rewardsRedeemed).toBe(0);
  });

  it("rejected → venueName e rewardName, senza reward/stampsAdded/rewardsRedeemed", async () => {
    const u = await fx.newUserWithSession("p3");
    await visit(venueA, u.token);
    const { body: v } = await visit(venueA, u.token);
    expect((await reject(venueA, v.requestId)).status).toBe(200);
    const r = await poll(v.requestId, u.token);
    expect(r.body.status).toBe("rejected");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
    for (const k of ["reward", "stampsAdded", "rewardsRedeemed"]) expect(r.body).not.toHaveProperty(k);
  });

  it("expired (scadenza lazy) → venueName e rewardName", async () => {
    const u = await fx.newUserWithSession("p4");
    await visit(venueA, u.token);
    const { body: v } = await visit(venueA, u.token);
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [v.requestId]);
    const r = await poll(v.requestId, u.token);
    expect(r.body.status).toBe("expired");
    expect(r.body.venueName).toBe(await venueNameOf(venueA));
    expect(r.body.rewardName).toBe("Pizza margherita");
  });
});

describe("promozione cambiata", () => {
  it("polling pending con card sulla vecchia promozione → rewardName della promozione attiva", async () => {
    const c = await staleCustomer("c1");
    const r = await poll(c.requestId, c.token);
    expect(r.body.promotionChanged).toBe(true);
    expect(r.body.rewardName).toBe("Premio nuovo");
    expect(r.body.venueName).toBe(await venueNameOf(venueB));
  });

  it("polling approved dopo il rollover → rewardName della nuova promozione", async () => {
    const c = await staleCustomer("c2");
    expect((await confirm(venueB, c.requestId, 2)).status).toBe(200);
    const r = await poll(c.requestId, c.token);
    expect(r.body.status).toBe("approved");
    expect(r.body.rewardName).toBe("Premio nuovo");
    expect(r.body.reward).toBe("Premio nuovo");
  });
});

describe("sicurezza e dati personali", () => {
  it("richiesta di un altro utente → 404 identico a una inesistente, senza venueName né rewardName", async () => {
    const owner = await fx.newUserWithSession("s1");
    const intruder = await fx.newUserWithSession("s2");
    await visit(venueA, owner.token);
    const { body: v } = await visit(venueA, owner.token);
    const foreign = await poll(v.requestId, intruder.token);
    const missing = await poll(crypto.randomUUID(), intruder.token);
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect(JSON.stringify(foreign.body)).not.toMatch(/venueName|rewardName/);
  });

  it("nessuna email né branding nelle risposte; solo i campi attesi", async () => {
    const u = await fx.newUserWithSession("s3");
    const created = await visit(venueA, u.token);
    const pending = await visit(venueA, u.token);
    const polled = await poll(pending.body.requestId, u.token);
    for (const r of [created, pending, polled]) {
      const s = JSON.stringify(r.body);
      expect(s).not.toContain(u.email);
      expect(s).not.toMatch(/branding|logoUrl|backgroundColor|banner/);
    }
    expect(Object.keys(pending.body).sort()).toEqual(
      ["expiresAt", "promotionChanged", "requestId", "rewardName", "state", "venueName"],
    );
    expect(Object.keys(polled.body).sort()).toEqual(
      ["expiresAt", "promotionChanged", "publicCode", "rewardName", "stampsCount", "stampsRequired", "status", "venueName"],
    );
  });
});
