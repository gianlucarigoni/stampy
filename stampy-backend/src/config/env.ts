import "dotenv/config";
import { z } from "zod";

// Stringa vuota = variabile assente (il .env di partenza ha le chiavi senza valore).
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    APP_ORIGIN: z.string().url().default("http://localhost:5173"),
    WALLET_ISSUER_ID: z.string().regex(/^\d+$/, "..."),
    WALLET_SERVICE_ACCOUNT_EMAIL: z.string().email(),
    WALLET_SERVICE_ACCOUNT_KEY_PATH: z.string().min(1),
    OTP_HMAC_SECRET: z.string().min(1),
    // Numero di proxy fidati davanti all'app (0 = nessuno). Dietro Cloudflare/altri
    // proxy va messo il numero di hop, MAI `true` (permette di falsificare X-Forwarded-For).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Forza il limiter IP su /auth/email/*: "on" | "off". Se assente, attivo solo in produzione.
    IP_RATE_LIMIT: z.enum(["on", "off"]).optional(),
    // Invio dei codici OTP: "console" (log, solo sviluppo), "gmail" (SMTP) o "both" (entrambi, solo sviluppo).
    EMAIL_PROVIDER: z.enum(["console", "gmail", "both"]).default("console"),
    GMAIL_USER: z.preprocess(emptyToUndefined, z.string().email().optional()),
    GMAIL_APP_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
  })
  .superRefine((e, ctx) => {
    if (e.EMAIL_PROVIDER !== "console") {
      for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD"] as const) {
        if (!e[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `obbligatoria con EMAIL_PROVIDER=${e.EMAIL_PROVIDER}`,
          });
      }
    }
    // console e both loggano il codice OTP (dato personale): vietati in produzione.
    if (e.NODE_ENV === "production" && e.EMAIL_PROVIDER !== "gmail") {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "in produzione è ammesso solo gmail",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configurazione .env non valida:");
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
