/**
 * B32: GET /api/public/venues/:venueId, primo endpoint pubblico non di auth.
 * Restituisce solo il nome del locale; UUID inesistente e malformato → stesso 404.
 *
 * Usa il DB del worktree: crea un proprio locale con owner e staff `public-venue-*@test.it`, ripuliti in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "../../src/db";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("public-venue");
let baseUrl: string;
let stop: () => Promise<void>;
let venueId: string;
let owner: Awaited<ReturnType<typeof fx.newUserWithSession>>;

const get = (id: string, cookie?: string) => request(baseUrl, `/api/public/venues/${id}`, { cookie });

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
  venueId = await fx.newVenue("a");
  owner = await fx.newUserWithSession("owner");
  await fx.addMember(owner.id, venueId, "owner");
  const staff = await fx.newUserWithSession("staff");
  await fx.addMember(staff.id, venueId, "staff");
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("GET /api/public/venues/:venueId", () => {
  it("locale esistente, senza cookie → 200 con body esattamente {name}", async () => {
    const r = await get(venueId);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ name: "Test a" });
  });

  it("con cookie di sessione valido (anche di un membro) → stessa risposta 200", async () => {
    const anon = await get(venueId);
    const logged = await get(venueId, owner.token);
    expect(logged.status).toBe(200);
    expect(logged.body).toEqual(anon.body);
  });

  it("UUID inesistente → 404 VenueNotFound", async () => {
    const r = await get(randomUUID());
    expect(r.status).toBe(404);
    expect(r.body.error).toBe("VenueNotFound");
  });

  it.each([
    ["abc", "abc"],
    ["stringa lunga", "x".repeat(200)],
    ["byte nullo", "%00"],
    ["UUID con un carattere in più", `${randomUUID()}0`],
  ])("UUID malformato (%s) → 404 con body identico a quello dell'inesistente", async (_label, bad) => {
    const missing = await get(randomUUID());
    const r = await get(bad);
    expect(r.status).toBe(404);
    expect(r.body.error).toBe("VenueNotFound");
    expect(r.body).toEqual(missing.body);
  });

  it("locale con owner e staff → il body contiene solo {name}, nessun dato degli utenti", async () => {
    const r = await get(venueId);
    expect(Object.keys(r.body)).toEqual(["name"]);
    const text = JSON.stringify(r.body);
    expect(text).not.toContain("@");
    expect(text).not.toContain(owner.id);
    expect(text).not.toContain(venueId);
  });
});
