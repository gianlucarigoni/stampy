/**
 * POST /api/auth/email/request quando l'invio dell'email fallisce.
 * Il sender è sostituito con vi.spyOn (mai il DB). Dati propri `otp-mailfail-*@test.it`, eliminati in afterAll.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db";
import { emailSender } from "../../src/utils/email/email-sender";
import { request, startServer } from "../helpers/server";
import { makeFixtures } from "../helpers/fixtures";

const PATH = "/api/auth/email/request";
const fx = makeFixtures("otp-mailfail");
let baseUrl: string;
let stop: () => Promise<void>;

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await fx.cleanup();
  await stop();
  await pool.end();
});

describe("POST /api/auth/email/request: invio fallito", () => {
  it("sendOtp rigetta → 503 «Impossibile inviare il codice, riprova», senza eco di email o codice", async () => {
    const email = fx.email("a");
    vi.spyOn(emailSender, "sendOtp").mockRejectedValue(new Error("SMTP giù"));
    const r = await request(baseUrl, PATH, { method: "POST", body: { email } });
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).toContain("Impossibile inviare il codice, riprova");
    expect(JSON.stringify(r.body)).not.toContain(email);
    expect(JSON.stringify(r.body)).not.toContain("SMTP");
  });

  it("sendOtp riceve email normalizzata e un codice di 6 cifre", async () => {
    const email = fx.email("b");
    const spy = vi.spyOn(emailSender, "sendOtp").mockResolvedValue();
    const r = await request(baseUrl, PATH, { method: "POST", body: { email: email.toUpperCase() } });
    expect(r.status).toBe(202);
    expect(spy).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
  });
});
