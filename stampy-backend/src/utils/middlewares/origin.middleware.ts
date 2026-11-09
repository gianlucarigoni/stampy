import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { OriginNotAllowedError } from "../../errors/origin-not-allowed.error";

export const ALLOWED_ORIGIN = new URL(env.APP_ORIGIN).origin;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Difesa CSRF senza token (decisione B3): sui metodi che cambiano stato, se il browser
 * manda `Origin` deve essere APP_ORIGIN. Senza `Origin` (curl, Bruno, test) passa:
 * i browser lo inviano sempre sulle richieste cross-origin che modificano stato.
 */
export function requireSameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin === undefined || origin === ALLOWED_ORIGIN) return next();
  next(new OriginNotAllowedError());
}
