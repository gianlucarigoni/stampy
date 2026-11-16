/**
 * PATCH /api/auth/me — lacune del nome visualizzato (segni combinanti, NFC, nomi senza lettere).
 *
 * Tocca il DB del worktree. Dati `auth-namegap-*@test.it`, eliminati in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const fx = makeFixtures("auth-namegap");
let baseUrl: string;
let stop: () => Promise<void>;

const patch = (cookie: string | undefined, body: unknown) =>
  request(baseUrl, "/api/auth/me", { method: "PATCH", cookie, body });

const dbName = async (userId: string): Promise<string | null> =>
  (await pool.query(`SELECT display_name FROM users WHERE id = $1`, [userId])).rows[0].display_name;

const ORIGINAL = "Test Utente";

const accepted = async (tag: string, input: string, expectedInDb: string) => {
  const u = await fx.newUserWithSession(tag);
  const r = await patch(u.token, { displayName: input });
  expect(r.status).toBe(200);
  expect(await dbName(u.id)).toBe(expectedInDb);
  return r;
};

const rejected = async (tag: string, input: string) => {
  const u = await fx.newUserWithSession(tag);
  const r = await patch(u.token, { displayName: input });
  expect(r.status).toBe(400);
  expect(await dbName(u.id)).toBe(ORIGINAL);
};

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("PATCH /api/auth/me — lacune del nome", () => {
  describe("segni combinanti (nomi in forma scomposta e non latini)", () => {
    it('"Jose" + accento combinante (NFD) → 200, salvato in forma composta "José Rossi"', async () => {
      const r = await accepted("nfd", "José Rossi", "José Rossi");
      expect(r.body.user.displayName).toBe("José Rossi");
    });
    it("nome devanagari → 200, salvato così com'è", () => accepted("hindi", "राहुल शर्मा", "राहुल शर्मा"));
    it("nome thai → 200, salvato così com'è", () => accepted("thai", "สมชาย ใจดี", "สมชาย ใจดี"));
    it("la forma composta e quella scomposta danno lo stesso valore nel DB", async () => {
      const a = await fx.newUserWithSession("nfc-a");
      const b = await fx.newUserWithSession("nfc-b");
      expect((await patch(a.token, { displayName: "José Rossi" })).status).toBe(200);
      expect((await patch(b.token, { displayName: "José Rossi" })).status).toBe(200);
      expect(await dbName(a.id)).toBe(await dbName(b.id));
    });
    it("solo segni combinanti → 400, DB invariato", () => rejected("marks-only", "́́́"));
  });

  describe("nome senza lettere", () => {
    it('"...", "---", "123" → 400, DB invariato', async () => {
      await rejected("nolet-dots", "...");
      await rejected("nolet-dash", "---");
      await rejected("nolet-num", "123");
    });
    it('una lettera basta: "A-1" e "J.R." → 200', async () => {
      await accepted("onelet-a", "A-1", "A-1");
      await accepted("onelet-b", "J.R.", "J.R.");
    });
  });

  describe("invarianti che restano", () => {
    it("spazio non separabile interno → 400", () => rejected("nbsp", "Mario Rossi"));
    it("emoji → 400", () => rejected("emoji", "Mario 😀"));
    it("< e > → 400 anche accanto a segni combinanti", () => rejected("html", "José <b>"));
  });
});
