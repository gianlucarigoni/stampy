import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  WALLET_ISSUER_ID: z.string().regex(/^\d+$/, "..."),
  WALLET_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  WALLET_SERVICE_ACCOUNT_KEY_PATH: z.string().min(1),
  OTP_HMAC_SECRET: z.string().min(1),
  // Numero di proxy fidati davanti all'app (0 = nessuno). Dietro Cloudflare/altri
  // proxy va messo il numero di hop, MAI `true` (permette di falsificare X-Forwarded-For).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Forza il limiter IP su /auth/email/*: "on" | "off". Se assente, attivo solo in produzione.
  IP_RATE_LIMIT: z.enum(["on", "off"]).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configurazione .env non valida:");
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
