import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const keySchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().includes("BEGIN PRIVATE KEY"),
});

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

export function loadServiceAccount(keyPath: string, expectedEmail: string): ServiceAccount {
  const absolute = path.resolve(keyPath);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(absolute, "utf8"));
  } catch {
    throw new Error(`Impossibile leggere la chiave del service account in: ${absolute}`);
  }

  const parsed = keySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Il file della chiave non sembra un JSON di service account Google valido");
  }

  if (parsed.data.client_email !== expectedEmail) {
    throw new Error("WALLET_SERVICE_ACCOUNT_EMAIL nel .env non coincide con client_email del file della chiave");
  }

  return { clientEmail: parsed.data.client_email, privateKey: parsed.data.private_key };
}
