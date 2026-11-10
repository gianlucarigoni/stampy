import { describe, expect, it } from "vitest";
import { envSchema } from "../../src/config/env";

// Variabili minime valide: servono solo a isolare le regole di EMAIL_PROVIDER.
const base = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  WALLET_ISSUER_ID: "123",
  WALLET_SERVICE_ACCOUNT_EMAIL: "sa@example.iam.gserviceaccount.com",
  WALLET_SERVICE_ACCOUNT_KEY_PATH: "./secrets/key.json",
  OTP_HMAC_SECRET: "segreto",
};
const creds = { GMAIL_USER: "stampy@gmail.com", GMAIL_APP_PASSWORD: "abcdabcdabcdabcd" };

const parse = (extra: Record<string, string | undefined>) => envSchema.safeParse({ ...base, ...extra });

describe("env: EMAIL_PROVIDER", () => {
  it("senza EMAIL_PROVIDER il default è console", () => {
    const r = parse({});
    expect(r.success).toBe(true);
    expect(r.success && r.data.EMAIL_PROVIDER).toBe("console");
  });

  it("console con credenziali vuote (come nel .env di partenza) → valido", () => {
    expect(parse({ EMAIL_PROVIDER: "console", GMAIL_USER: "", GMAIL_APP_PASSWORD: "" }).success).toBe(true);
  });

  it("gmail senza GMAIL_USER e GMAIL_APP_PASSWORD → errore su entrambe", () => {
    const r = parse({ EMAIL_PROVIDER: "gmail" });
    expect(r.success).toBe(false);
    const paths = !r.success ? r.error.issues.map((i) => i.path.join(".")) : [];
    expect(paths).toEqual(expect.arrayContaining(["GMAIL_USER", "GMAIL_APP_PASSWORD"]));
  });

  it("gmail con credenziali vuote → errore (stringa vuota = assente)", () => {
    expect(parse({ EMAIL_PROVIDER: "gmail", GMAIL_USER: "", GMAIL_APP_PASSWORD: "" }).success).toBe(false);
  });

  it("both senza credenziali → errore", () => {
    expect(parse({ EMAIL_PROVIDER: "both" }).success).toBe(false);
  });

  it("both con credenziali → valido", () => {
    expect(parse({ EMAIL_PROVIDER: "both", ...creds }).success).toBe(true);
  });

  it("GMAIL_USER che non è un'email → errore", () => {
    expect(parse({ EMAIL_PROVIDER: "gmail", ...creds, GMAIL_USER: "non-una-email" }).success).toBe(false);
  });

  it("valore sconosciuto (smtp) → errore", () => {
    expect(parse({ EMAIL_PROVIDER: "smtp", ...creds }).success).toBe(false);
  });

  it("production con console → errore", () => {
    const r = parse({ NODE_ENV: "production", EMAIL_PROVIDER: "console" });
    expect(r.success).toBe(false);
    const paths = !r.success ? r.error.issues.map((i) => i.path.join(".")) : [];
    expect(paths).toContain("EMAIL_PROVIDER");
  });

  it("production con both → errore", () => {
    expect(parse({ NODE_ENV: "production", EMAIL_PROVIDER: "both", ...creds }).success).toBe(false);
  });

  it("production senza EMAIL_PROVIDER (default console) → errore", () => {
    expect(parse({ NODE_ENV: "production" }).success).toBe(false);
  });

  it("production con gmail e credenziali → valido", () => {
    expect(parse({ NODE_ENV: "production", EMAIL_PROVIDER: "gmail", ...creds }).success).toBe(true);
  });
});
