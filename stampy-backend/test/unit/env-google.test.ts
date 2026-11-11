import { describe, expect, it } from "vitest";
import { envSchema } from "../../src/config/env";

const base = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  WALLET_ISSUER_ID: "123",
  WALLET_SERVICE_ACCOUNT_EMAIL: "sa@example.iam.gserviceaccount.com",
  WALLET_SERVICE_ACCOUNT_KEY_PATH: "./secrets/key.json",
  OTP_HMAC_SECRET: "segreto",
};

describe("env: GOOGLE_CLIENT_ID", () => {
  it("stringa vuota (come nel .env di partenza) → valido e undefined", () => {
    const r = envSchema.safeParse({ ...base, GOOGLE_CLIENT_ID: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  // Aggiunto: senza questo il test sopra passerebbe anche prima di dichiarare la variabile.
  it("valorizzato → passa invariato", () => {
    const r = envSchema.safeParse({ ...base, GOOGLE_CLIENT_ID: "x.apps.googleusercontent.com" });
    expect(r.success && r.data.GOOGLE_CLIENT_ID).toBe("x.apps.googleusercontent.com");
  });
});
