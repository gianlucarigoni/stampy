import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WALLET_ISSUER_ID: z
    .string()
    .regex(/^\d+$/, "l'Issuer ID è numerico: se hai incollato il Merchant ID (alfanumerico) è quello sbagliato"),
  WALLET_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  WALLET_SERVICE_ACCOUNT_KEY_PATH: z.string().min(1),
  DEV_ENDPOINT_SECRET: z.string().min(32, "almeno 32 caratteri"),
  PUBLIC_BASE_URL: z.union([z.string().url(), z.literal("")]).default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configurazione .env non valida:");
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PUBLIC_BASE_URL: parsed.data.PUBLIC_BASE_URL.replace(/\/+$/, ""),
};
