/**
 * GET /api/cards/mine (B30, #62): le card dell'utente connesso, una per locale, col branding e il
 * link di salvataggio firmato in locale. Nessuna scrittura.
 *
 * Tocca il DB del worktree: crea propri locali, utenti e card (`cards-mine-test-*`), eliminati in afterAll.
 */
import jwt from "jsonwebtoken";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("cards-mine-test");
let baseUrl: string;
let stop: () => Promise<void>;
let venueA: string;
let venueB: string;
let a: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let b: Awaited<ReturnType<typeof fx.newUserWithSession>>;
let nobody: Awaited<ReturnType<typeof fx.newUserWithSession>>;

const mine = (cookie?: string) => request(baseUrl, "/api/cards/mine", { cookie });
const touch = (venue: string, cookie: string) => request(baseUrl, `/api/venues/${venue}/visit`, { method: "POST", cookie });
const cardId = async (userId: string, venueId: string) =>
  (await pool.query(`SELECT id FROM cards WHERE user_id = $1 AND venue_id = $2`, [userId, venueId])).rows[0].id as string;
const count = async (table: string) => Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
const payload = (saveUrl: string) => jwt.decode(saveUrl.split("/gp/v/save/")[1]) as any;

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueA = await fx.newVenue("a", { stampsRequired: 10 });
  venueB = await fx.newVenue("b", { stampsRequired: 5 });
  a = await fx.newUserWithSession("a");
  b = await fx.newUserWithSession("b");
  nobody = await fx.newUserWithSession("nobody");
  await touch(venueA, a.token);
  await touch(venueB, a.token);
  await touch(venueA, b.token);
  await pool.query(`UPDATE cards SET stamps_count = 3 WHERE user_id = $1 AND venue_id = $2`, [a.id, venueA]);
  await pool.query(`UPDATE cards SET stamps_count = 5 WHERE user_id = $1 AND venue_id = $2`, [a.id, venueB]);
});
afterAll(async () => {
  vi.restoreAllMocks();
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/cards/mine", () => {
  describe("autenticazione", () => {
    it("senza cookie di sessione: 401", async () => {
      expect((await mine()).status).toBe(401);
    });

    it("sessione revocata o scaduta: 401", async () => {
      const revoked = await fx.newUserWithSession("revoked");
      await pool.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [revoked.sessionId]);
      const expired = await fx.newUser("expired");
      const s = await fx.newSession(expired.id, { expiresMinutesAgo: 5 });
      expect((await mine(revoked.token)).status).toBe(401);
      expect((await mine(s.token)).status).toBe(401);
    });

    it("utente anonimizzato: 401, nessuna card restituita", async () => {
      const anon = await fx.newUserWithSession("anon");
      await touch(venueA, anon.token);
      await pool.query(`UPDATE users SET anonymized_at = now() WHERE id = $1`, [anon.id]);
      const r = await mine(anon.token);
      expect(r.status).toBe(401);
      expect(r.body.cards).toBeUndefined();
    });
  });

  describe("elenco vuoto", () => {
    it("utente senza card: 200 {cards: []}", async () => {
      const r = await mine(nobody.token);
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ cards: [] });
    });

    it("owner o staff senza card: 200 {cards: []}", async () => {
      const staff = await fx.newUserWithSession("staff");
      const owner = await fx.newUserWithSession("owner");
      await fx.addMember(staff.id, venueA, "staff");
      await fx.addMember(owner.id, venueB, "owner");
      expect((await mine(staff.token)).body).toEqual({ cards: [] });
      expect((await mine(owner.token)).body).toEqual({ cards: [] });
    });
  });

  describe("più locali", () => {
    it("utente con card in 2 locali: 200 con 2 voci, una per locale, ciascuna col proprio venueId", async () => {
      const r = await mine(a.token);
      expect(r.status).toBe(200);
      expect(r.body.cards).toHaveLength(2);
      expect(r.body.cards.map((c: any) => c.venueId).sort()).toEqual([venueA, venueB].sort());
    });

    it("ogni voce ha esattamente venueId, venueName, branding, stampsCount, stampsRequired, walletStatus, saveUrl", async () => {
      const r = await mine(a.token);
      for (const c of r.body.cards) {
        expect(Object.keys(c).sort()).toEqual(
          ["branding", "saveUrl", "stampsCount", "stampsRequired", "venueId", "venueName", "walletStatus"].sort(),
        );
      }
    });

    it("l'ordine è dalla card più recente", async () => {
      const r = await mine(a.token);
      expect(r.body.cards.map((c: any) => c.venueId)).toEqual([venueB, venueA]);
    });

    it("branding: logoUrl e backgroundColor sempre presenti, bannerUrl solo se il locale lo ha", async () => {
      await pool.query(`UPDATE venues SET branding = $2::jsonb WHERE id = $1`, [
        venueB,
        JSON.stringify({ v: 1, logoUrl: "https://placehold.co/512x512.png", backgroundColor: "#00AA00", bannerUrl: "https://placehold.co/1032x336.png" }),
      ]);
      const cards = (await mine(a.token)).body.cards;
      const ca = cards.find((c: any) => c.venueId === venueA);
      const cb = cards.find((c: any) => c.venueId === venueB);
      expect(ca.branding).toEqual({ logoUrl: "https://placehold.co/512x512.png", backgroundColor: "#AA0000" });
      expect(cb.branding).toEqual({
        logoUrl: "https://placehold.co/512x512.png",
        backgroundColor: "#00AA00",
        bannerUrl: "https://placehold.co/1032x336.png",
      });
    });

    it("stampsCount e stampsRequired riflettono la card e la promozione (3/10 e 5/5)", async () => {
      const cards = (await mine(a.token)).body.cards;
      const ca = cards.find((c: any) => c.venueId === venueA);
      const cb = cards.find((c: any) => c.venueId === venueB);
      expect([ca.stampsCount, ca.stampsRequired]).toEqual([3, 10]);
      expect([cb.stampsCount, cb.stampsRequired]).toEqual([5, 5]);
    });

    it("card piena (N/N): la voce c'è con stampsCount = stampsRequired", async () => {
      const cb = (await mine(a.token)).body.cards.find((c: any) => c.venueId === venueB);
      expect(cb.stampsCount).toBe(cb.stampsRequired);
    });

    it("walletStatus not_added e active sono entrambi restituiti: la voce c'è sempre", async () => {
      await pool.query(`UPDATE cards SET wallet_status = 'active' WHERE user_id = $1 AND venue_id = $2`, [a.id, venueA]);
      const cards = (await mine(a.token)).body.cards;
      expect(cards.find((c: any) => c.venueId === venueA).walletStatus).toBe("active");
      expect(cards.find((c: any) => c.venueId === venueB).walletStatus).toBe("not_added");
      expect(cards.every((c: any) => typeof c.saveUrl === "string")).toBe(true);
    });
  });

  describe("isolamento tra utenti", () => {
    it("due utenti con card nello stesso locale: ognuno vede solo la propria", async () => {
      const rb = await mine(b.token);
      expect(rb.body.cards).toHaveLength(1);
      expect(rb.body.cards[0].venueId).toBe(venueA);
      expect(rb.body.cards[0].stampsCount).toBe(0);
    });

    it("la risposta non contiene publicCode, userId, cardId, walletObjectId né email", async () => {
      const r = await mine(a.token);
      expect(r.status).toBe(200);
      const text = JSON.stringify(r.body);
      const rows = (await pool.query(`SELECT id, public_code, wallet_object_id FROM cards WHERE user_id = ANY($1)`, [[a.id, b.id]])).rows;
      for (const row of rows) {
        expect(text).not.toContain(row.public_code);
        expect(text).not.toContain(row.id);
      }
      expect(text).not.toContain(a.id);
      expect(text).not.toContain(a.email);
      expect(text).not.toContain(b.email);
    });

    it("il saveUrl di A contiene solo gli object delle card di A, mai quella di B", async () => {
      const cardB = await cardId(b.id, venueA);
      const cardsA = (await mine(a.token)).body.cards;
      const ids = cardsA.map((c: any) => payload(c.saveUrl).payload.loyaltyObjects[0].id);
      expect(ids).toEqual(
        expect.arrayContaining([expect.stringContaining(await cardId(a.id, venueA)), expect.stringContaining(await cardId(a.id, venueB))]),
      );
      expect(ids.join()).not.toContain(cardB);
    });
  });

  describe("saveUrl", () => {
    it("è un link https://pay.google.com/gp/v/save/<jwt> firmato in locale", async () => {
      const c = (await mine(a.token)).body.cards[0];
      expect(c.saveUrl).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(payload(c.saveUrl).typ).toBe("savetowallet");
    });

    it("il JWT porta l'object della card dell'utente e la class del locale giusto", async () => {
      const c = (await mine(a.token)).body.cards.find((x: any) => x.venueId === venueA);
      const p = payload(c.saveUrl).payload;
      expect(p.loyaltyObjects[0].id).toContain(await cardId(a.id, venueA));
      expect(p.loyaltyClasses[0].id).toContain(venueA);
      expect(p.loyaltyObjects[0].classId).toBe(p.loyaltyClasses[0].id);
    });

    it("card su promozione non più attiva: il saveUrl mostra 0 timbri, come visit", async () => {
      const old = await fx.newOldPromotion(venueA);
      await pool.query(`UPDATE cards SET promotion_id = $2 WHERE user_id = $1 AND venue_id = $3`, [a.id, old, venueA]);
      const c = (await mine(a.token)).body.cards.find((x: any) => x.venueId === venueA);
      expect(payload(c.saveUrl).payload.loyaltyObjects[0].loyaltyPoints.balance.int).toBe(0);
      expect([c.stampsCount, c.stampsRequired]).toEqual([0, 10]);
      const active = (await pool.query(`SELECT id FROM promotions WHERE venue_id = $1 AND ends_at IS NULL`, [venueA])).rows[0].id;
      await pool.query(`UPDATE cards SET promotion_id = $2 WHERE user_id = $1 AND venue_id = $3`, [a.id, active, venueA]);
    });

    it("locale senza promozione attiva: la voce c'è con saveUrl null", async () => {
      const venueC = await fx.newVenue("c");
      const u = await fx.newUserWithSession("c");
      await touch(venueC, u.token);
      await pool.query(`UPDATE promotions SET ends_at = now() - interval '1 minute' WHERE venue_id = $1`, [venueC]);
      const r = await mine(u.token);
      expect(r.body.cards).toHaveLength(1);
      expect(r.body.cards[0].venueId).toBe(venueC);
      expect(r.body.cards[0].saveUrl).toBeNull();
    });

    it("nessuna chiamata di rete a Google: la firma è locale", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      expect((await mine(a.token)).status).toBe(200);
      const external = spy.mock.calls.filter(([u]) => !String(u instanceof Request ? u.url : u).startsWith(baseUrl));
      expect(external).toHaveLength(0);
      spy.mockRestore();
    });
  });

  describe("locali archiviati", () => {
    it("card in un locale archiviato: voce non restituita", async () => {
      const venueD = await fx.newVenue("d");
      const u = await fx.newUserWithSession("d");
      await touch(venueD, u.token);
      expect((await mine(u.token)).body.cards).toHaveLength(1);
      await pool.query(`UPDATE venues SET archived_at = now() WHERE id = $1`, [venueD]);
      expect((await mine(u.token)).body).toEqual({ cards: [] });
    });
  });

  describe("nessuna scrittura", () => {
    it("il conteggio di righe in cards, stamp_requests, stamp_events e auth_events non cambia", async () => {
      const tables = ["cards", "stamp_requests", "stamp_events", "auth_events"];
      const before = await Promise.all(tables.map(count));
      expect((await mine(a.token)).status).toBe(200);
      expect((await mine(nobody.token)).status).toBe(200);
      expect(await Promise.all(tables.map(count))).toEqual(before);
    });

    it("wallet_status di una card not_added resta not_added", async () => {
      expect((await mine(a.token)).status).toBe(200);
      const r = await pool.query(`SELECT wallet_status FROM cards WHERE user_id = $1 AND venue_id = $2`, [a.id, venueB]);
      expect(r.rows[0].wallet_status).toBe("not_added");
    });
  });

  describe("tempo e log", () => {
    it("una promozione futura o scaduta è trattata come non attiva (now() del DB)", async () => {
      const venueE = await fx.newVenue("e");
      const u = await fx.newUserWithSession("e");
      await touch(venueE, u.token);
      await pool.query(`UPDATE promotions SET starts_at = now() + interval '1 hour' WHERE venue_id = $1`, [venueE]);
      expect((await mine(u.token)).body.cards[0].saveUrl).toBeNull();
    });

    it("nessun dato personale nei log: email, codice card e saveUrl non compaiono in console", async () => {
      const spies = (["log", "info", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
      const r = await mine(a.token);
      const out = spies.flatMap((s) => s.mock.calls).map((args) => args.map(String).join(" ")).join("\n");
      spies.forEach((s) => s.mockRestore());
      expect(r.status).toBe(200);
      const code = (await pool.query(`SELECT public_code FROM cards WHERE user_id = $1 LIMIT 1`, [a.id])).rows[0].public_code;
      expect(out).not.toContain(a.email);
      expect(out).not.toContain(code);
      expect(out).not.toContain("pay.google.com");
    });
  });
});
