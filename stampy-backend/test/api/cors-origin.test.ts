/**
 * B3 — CORS ristretto a una sola origin (APP_ORIGIN) con credentials
 *       + controllo di Origin sulle richieste che cambiano stato.
 *
 * Tocca il DB di sviluppo solo per le sessioni di test (`cors-origin-*@test.it`), eliminate in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { env } from "../../src/config/env";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("cors-origin");
const ALLOWED = new URL(env.APP_ORIGIN).origin;
const FOREIGN = "https://evil.example";
let baseUrl: string;
let stop: () => Promise<void>;

// POST pubblica: con body vuoto la validazione risponde 400, quindi "400" = la richiesta ha superato il controllo.
const postRequestOtp = (origin?: string) =>
  request(baseUrl, "/api/auth/email/request", {
    method: "POST",
    body: {},
    headers: origin === undefined ? {} : { Origin: origin },
  });

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("CORS ristretto a una sola origin", () => {
  describe("preflight OPTIONS", () => {
    it("da APP_ORIGIN → 204 con Allow-Origin = APP_ORIGIN e Allow-Credentials: true", async () => {
      const r = await request(baseUrl, "/api/auth/email/request", {
        method: "OPTIONS",
        headers: { Origin: ALLOWED, "Access-Control-Request-Method": "POST" },
      });
      expect(r.status).toBe(204);
      expect(r.headers.get("access-control-allow-origin")).toBe(ALLOWED);
      expect(r.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("da un'origin estranea → nessun Access-Control-Allow-Origin", async () => {
      const r = await request(baseUrl, "/api/auth/email/request", {
        method: "OPTIONS",
        headers: { Origin: FOREIGN, "Access-Control-Request-Method": "POST" },
      });
      expect(r.headers.get("access-control-allow-origin")).toBeNull();
    });
  });

  describe("risposte normali", () => {
    it("GET con Origin = APP_ORIGIN → Allow-Origin = APP_ORIGIN (mai '*')", async () => {
      const r = await request(baseUrl, "/api/auth/me", { headers: { Origin: ALLOWED } });
      expect(r.headers.get("access-control-allow-origin")).toBe(ALLOWED);
      expect(r.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("GET con Origin estranea → passa, ma senza Access-Control-Allow-Origin", async () => {
      const r = await request(baseUrl, "/api/auth/me", { headers: { Origin: FOREIGN } });
      expect(r.status).toBe(401); // non 403: i metodi sicuri non si controllano
      expect(r.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("nessuna risposta contiene mai Access-Control-Allow-Origin: '*'", async () => {
      const risposte = [
        await request(baseUrl, "/api/auth/me"),
        await request(baseUrl, "/api/auth/me", { headers: { Origin: FOREIGN } }),
        await request(baseUrl, "/api/auth/me", { headers: { Origin: ALLOWED } }),
        await postRequestOtp(),
        await postRequestOtp(FOREIGN),
      ];
      for (const r of risposte) expect(r.headers.get("access-control-allow-origin")).not.toBe("*");
    });
  });
});

describe("controllo di Origin sulle richieste che cambiano stato", () => {
  it("POST con Origin = APP_ORIGIN → passa (non 403)", async () => {
    const r = await postRequestOtp(ALLOWED);
    expect(r.status).toBe(400);
  });

  it("POST con Origin estranea → 403 e il body non rivela l'origin attesa", async () => {
    const r = await postRequestOtp(FOREIGN);
    expect(r.status).toBe(403);
    expect(JSON.stringify(r.body)).not.toContain(ALLOWED);
    expect(JSON.stringify(r.body)).not.toContain(new URL(ALLOWED).host);
  });

  it("POST con Origin 'null' (iframe sandbox, file://) → 403", async () => {
    const r = await postRequestOtp("null");
    expect(r.status).toBe(403);
  });

  it("POST senza header Origin (curl, Bruno, test) → passa", async () => {
    const r = await postRequestOtp();
    expect(r.status).toBe(400);
  });

  it("PUT, PATCH, DELETE con Origin estranea → 403", async () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const r = await request(baseUrl, "/api/auth/logout", { method, headers: { Origin: FOREIGN } });
      expect(r.status, method).toBe(403);
    }
  });

  it("POST con Origin estranea e cookie di sessione valido → 403 e la sessione non viene revocata", async () => {
    const { session } = await (async () => {
      const u = await fx.newUser("logout");
      return { session: await fx.newSession(u.id) };
    })();
    const r = await request(baseUrl, "/api/auth/logout", {
      method: "POST",
      cookie: session.token,
      headers: { Origin: FOREIGN },
    });
    expect(r.status).toBe(403);
    const db = await pool.query(`SELECT revoked_at FROM sessions WHERE id = $1`, [session.sessionId]);
    expect(db.rows[0].revoked_at).toBeNull();
  });

  it("GET con Origin estranea → passa (metodo sicuro, non controllato)", async () => {
    const r = await request(baseUrl, "/api/auth/me", { headers: { Origin: FOREIGN } });
    expect(r.status).not.toBe(403);
  });

  it("POST con Origin estranea su route inesistente /api/xyz → 403 (il controllo precede il 404)", async () => {
    const r = await request(baseUrl, "/api/xyz", { method: "POST", headers: { Origin: FOREIGN } });
    expect(r.status).toBe(403);
  });
});
