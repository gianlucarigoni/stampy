/**
 * PATCH /api/auth/me — imposta o modifica il proprio nome visualizzato (B5, #58).
 *
 * Tocca il DB del worktree. Dati `auth-name-*@test.it`, eliminati in afterAll.
 * Il rate limit per IP è spento fuori produzione (vedi ip-rate-limit.middleware.ts):
 * non si testa qui.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { request, startServer, type Res } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("auth-name");
let baseUrl: string;
let stop: () => Promise<void>;

const patch = (cookie: string | undefined, body: unknown, headers?: Record<string, string>) =>
  request(baseUrl, "/api/auth/me", { method: "PATCH", cookie, body, headers });

const dbName = async (userId: string): Promise<string | null> =>
  (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [userId])).rows[0].display_name;

async function userWithNullName(tag: string) {
  const u = await fx.newUserWithSession(tag);
  await pool.query(`UPDATE users SET display_name = NULL WHERE id = $1`, [u.id]);
  return u;
}

// Tutti i 401 devono avere lo stesso corpo (anche quello di GET /me).
let unauthorizedBody: string | null = null;
function expectSame401(r: Res) {
  expect(r.status).toBe(401);
  const body = JSON.stringify(r.body ?? {});
  unauthorizedBody ??= body;
  expect(body).toBe(unauthorizedBody);
}

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("PATCH /api/auth/me", () => {
  describe("autenticazione", () => {
    it("senza cookie → 401", async () => {
      expectSame401(await patch(undefined, { displayName: "Mario Rossi" }));
    });

    it("sessione revocata → 401 e il nome non cambia", async () => {
      const u = await fx.newUser("revoked", { displayName: "Nome Vecchio" });
      const s = await fx.newSession(u.id, { revoked: true });
      expectSame401(await patch(s.token, { displayName: "Mario Rossi" }));
      expect(await dbName(u.id)).toBe("Nome Vecchio");
    });

    it("sessione scaduta → 401 e il nome non cambia", async () => {
      const u = await fx.newUser("expired", { displayName: "Nome Vecchio" });
      const s = await fx.newSession(u.id, { expiresMinutesAgo: 1 });
      expectSame401(await patch(s.token, { displayName: "Mario Rossi" }));
      expect(await dbName(u.id)).toBe("Nome Vecchio");
    });

    it("utente anonimizzato con sessione ancora presente → 401 e il nome non cambia", async () => {
      const u = await fx.newUser("anon", { anonymized: true, displayName: "Nome Vecchio" });
      const s = await fx.newSession(u.id);
      expectSame401(await patch(s.token, { displayName: "Mario Rossi" }));
      expect(await dbName(u.id)).toBe("Nome Vecchio");
    });
  });

  describe("imposta il nome", () => {
    it("utente con display_name NULL → 200, solo { user: { id, email, displayName } }, nome salvato", async () => {
      const u = await userWithNullName("set");
      const r = await patch(u.token, { displayName: "Mario Rossi" });

      expect(r.status).toBe(200);
      expect(Object.keys(r.body)).toEqual(["user"]);
      expect(r.body.user).toEqual({ id: u.id, email: u.email, displayName: "Mario Rossi" });
      expect(JSON.stringify(r.body)).not.toContain(u.token);
      expect(await dbName(u.id)).toBe("Mario Rossi");
    });

    it("utente con un nome già presente → 200 e il DB riporta il nuovo", async () => {
      const u = await fx.newUserWithSession("change");
      const r = await patch(u.token, { displayName: "Luigi Verdi" });

      expect(r.status).toBe(200);
      expect(r.body.user.displayName).toBe("Luigi Verdi");
      expect(await dbName(u.id)).toBe("Luigi Verdi");
    });

    it("il nuovo nome si vede anche in GET /me", async () => {
      const u = await userWithNullName("getme");
      await patch(u.token, { displayName: "Anna Bianchi" });
      const r = await request(baseUrl, "/api/auth/me", { cookie: u.token });
      expect(r.body.user.displayName).toBe("Anna Bianchi");
    });

    it('"  Mario   Rossi  " → 200, salvato "Mario Rossi" (trim e spazi interni ridotti a uno)', async () => {
      const u = await fx.newUserWithSession("trim");
      const r = await patch(u.token, { displayName: "  Mario   Rossi  " });

      expect(r.status).toBe(200);
      expect(r.body.user.displayName).toBe("Mario Rossi");
      expect(await dbName(u.id)).toBe("Mario Rossi");
    });

    it("lettere accentate, apostrofo, trattino e punto → 200", async () => {
      const u = await fx.newUserWithSession("chars");
      for (const name of ["Zoë D'Angelo-Neri", "José Núñez", "J.R.R. Tolkien"]) {
        const r = await patch(u.token, { displayName: name });
        expect(r.status).toBe(200);
        expect(await dbName(u.id)).toBe(name);
      }
    });
  });

  describe("validazione (400, il DB non cambia)", () => {
    const bad = async (body: unknown) => {
      const u = await fx.newUserWithSession(`bad-${Math.random().toString(36).slice(2, 8)}`);
      const r = await patch(u.token, body);
      expect(r.status).toBe(400);
      expect(await dbName(u.id)).toBe("Test Utente");
    };

    it("body vuoto", () => bad({}));
    it("displayName null", () => bad({ displayName: null }));
    it("displayName non stringa (numero, oggetto, array)", async () => {
      await bad({ displayName: 12345 });
      await bad({ displayName: { first: "Mario" } });
      await bad({ displayName: ["Mario Rossi"] });
    });
    it("stringa vuota o di soli spazi (nessuna cancellazione del nome)", async () => {
      await bad({ displayName: "" });
      await bad({ displayName: "     " });
    });
    it("meno di 3 caratteri dopo il trim", async () => {
      await bad({ displayName: "Al" });
      await bad({ displayName: "  Al  " });
    });
    it("più di 50 caratteri dopo il trim", () => bad({ displayName: "a".repeat(51) }));
    it("caratteri di controllo o a capo", async () => {
      await bad({ displayName: "Mario\nRossi" });
      await bad({ displayName: "Mario\u0000Rossi" });
      await bad({ displayName: "Mario\tRossi" });
    });
    it("con < o > (nessun HTML nel nome)", async () => {
      await bad({ displayName: "<b>Mario</b>" });
      await bad({ displayName: "Mario > Rossi" });
    });
    it("campi extra nel body (email, id, anonymizedAt) → 400", async () => {
      await bad({ displayName: "Mario Rossi", email: "altro@test.it" });
      await bad({ displayName: "Mario Rossi", id: "00000000-0000-0000-0000-000000000000" });
      await bad({ displayName: "Mario Rossi", anonymizedAt: "2026-01-01" });
    });

    it("limiti esatti: 3 caratteri → 200, 50 caratteri → 200", async () => {
      const u = await fx.newUserWithSession("limits");
      expect((await patch(u.token, { displayName: "Ana" })).status).toBe(200);
      expect((await patch(u.token, { displayName: "a".repeat(50) })).status).toBe(200);
      expect(await dbName(u.id)).toBe("a".repeat(50));
    });
  });

  describe("sicurezza", () => {
    it("A modifica il proprio nome: il nome di B e le email restano invariati", async () => {
      const a = await fx.newUserWithSession("iso-a");
      const b = await fx.newUserWithSession("iso-b");
      const before = (await pool.query(`SELECT id, email FROM users WHERE id = ANY($1) ORDER BY id`, [[a.id, b.id]]))
        .rows;

      expect((await patch(a.token, { displayName: "Solo Per A" })).status).toBe(200);

      expect(await dbName(a.id)).toBe("Solo Per A");
      expect(await dbName(b.id)).toBe("Test Utente");
      const after = (await pool.query(`SELECT id, email FROM users WHERE id = ANY($1) ORDER BY id`, [[a.id, b.id]]))
        .rows;
      expect(after).toEqual(before);
    });

    it("Origin estranea → 403 e il nome non cambia", async () => {
      const u = await fx.newUserWithSession("origin");
      const r = await patch(u.token, { displayName: "Mario Rossi" }, { Origin: "https://evil.example" });
      expect(r.status).toBe(403);
      expect(await dbName(u.id)).toBe("Test Utente");
    });

    it("il nome non finisce in auth_events (né in metadata né come evento nuovo)", async () => {
      const u = await fx.newUserWithSession("noevent");
      const count = async () =>
        Number((await pool.query(`SELECT count(*) FROM auth_events WHERE user_id = $1`, [u.id])).rows[0].count);
      const before = await count();

      await patch(u.token, { displayName: "Nome Segretissimo" });

      expect(await count()).toBe(before);
      const leak = await pool.query(`SELECT 1 FROM auth_events WHERE user_id = $1 AND metadata::text LIKE $2`, [
        u.id,
        "%Segretissimo%",
      ]);
      expect(leak.rowCount).toBe(0);
    });
  });
});
