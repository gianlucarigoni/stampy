import { Router } from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { WalletProvider } from "../modules/wallet/walletProvider.js";

const sha = (v: string) => createHash("sha256").update(v).digest();

const querySchema = z
  .object({
    name: z.string().trim().min(1).max(40).default("Cliente Test"),
    venue: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/)
      .default("demo"),
    venueName: z.string().trim().min(1).max(40).default("Bar Demo"),
    stamps: z.coerce.number().int().min(0).max(50).default(0),
    required: z.coerce.number().int().min(1).max(50).default(10),
    format: z.enum(["redirect", "json"]).default("redirect"),
  })
  .refine((q) => q.stamps <= q.required, { message: "stamps non può superare required" });

export interface DevWalletDeps {
  devSecret: string;
  publicBaseUrl: string;
  walletProvider: WalletProvider;
}

export function createDevWalletRouter(deps: DevWalletDeps): Router {
  const router = Router();
  const expected = sha(deps.devSecret);

  router.get("/wallet/save-link", async (req, res, next) => {
    try {
      const provided = req.get("x-dev-secret") ?? (typeof req.query.key === "string" ? req.query.key : "");

      if (!timingSafeEqual(sha(provided), expected)) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      if (!deps.publicBaseUrl) {
        res.status(503).json({
          error: "PUBLIC_BASE_URL vuoto: avvia il tunnel, copia l'URL nel .env e riavvia il server",
        });
        return;
      }

      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid_query",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
        return;
      }

      const q = parsed.data;
      const cardId = randomUUID();

      const link = await deps.walletProvider.createSaveLink({
        cardId,
        venueId: q.venue,
        venueName: q.venueName,
        holderName: q.name,
        stamps: q.stamps,
        stampsRequired: q.required,
      });

      console.log(`[dev] pass generato: card=${cardId} venue=${q.venue}`);
      res.setHeader("Cache-Control", "no-store");

      if (q.format === "json") {
        res.json({ cardId, link });
        return;
      }
      res.redirect(302, link);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
