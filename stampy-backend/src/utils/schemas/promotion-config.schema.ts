import { z } from "zod";

/**
 * Configurazione del modello promozionale "timbri" (v1).
 *
 * Fonte di verità: `promotions.config` (JSONB). Il codice non deve mai leggere
 * i campi senza validarli: una config corrotta è un errore di programmazione/dati,
 * non un input del client.
 *
 * `stampsRequired` ha un tetto: 100 timbri per premio è già oltre ogni uso reale e
 * protegge da valori assurdi (0, negativi, 1e9) che farebbero ciclare la conferma.
 */
export const promotionConfigSchema = z.strictObject({
  v: z.literal(1),
  stampsRequired: z.number().int().min(1).max(100),
  reward: z.string().min(1).max(200),
});

export type PromotionConfig = z.infer<typeof promotionConfigSchema>;
