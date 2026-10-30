import { NextFunction, Request, Response } from "express";
import { rateLimit, type RateLimitInfo } from "express-rate-limit";
import { env } from "../../config/env";
import { TryLaterError } from "../../errors/try-later.error";

/**
 * Rete di sicurezza generica contro l'abuso scriptato delle rotte `/auth/email/*`
 * (invio e verifica dei codici). NON sostituisce i limiti per destinatario, che
 * sono nel DB: quelli proteggono la singola casella, questo protegge l'app da
 * raffiche provenienti da un IP (es. invio massivo a email diverse).
 *
 * Attivo solo in produzione, oppure forzando `IP_RATE_LIMIT=on`. In sviluppo gli
 * script di test fanno decine di chiamate dallo stesso IP e verrebbero bloccati.
 *
 * Dipende da `trust proxy` (env `TRUST_PROXY`): dietro un proxy (Cloudflare) con
 * 0 hop il limiter vedrebbe l'IP del proxy e metterebbe tutti gli utenti nello
 * stesso secchio. Valore da verificare al primo deploy di staging.
 */
export const IP_RATE_LIMIT_WINDOW_MINUTES = 15;
export const IP_RATE_LIMIT_MAX = 30;

export const ipRateLimitEnabled = env.IP_RATE_LIMIT
  ? env.IP_RATE_LIMIT === "on"
  : env.NODE_ENV === "production";

export const ipAuthRateLimit = ipRateLimitEnabled
  ? rateLimit({
      windowMs: IP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      limit: IP_RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      // Stesso 429 delle altre rotte (TryLaterError). resetTime è l'orologio in memoria
      // del limiter, non una scadenza nel DB.
      handler: (req, _res, next) => {
        const resetTime = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit?.resetTime;
        const resetMs = resetTime ? resetTime.getTime() - Date.now() : IP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
        next(new TryLaterError(Math.max(1, Math.ceil(resetMs / 1000))));
      },
    })
  : (_req: Request, _res: Response, next: NextFunction) => next();
