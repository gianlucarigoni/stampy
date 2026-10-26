import { Request } from "express";
import { UnauthorizedError } from "../errors/unauthorized.error";
import { TypedAuthRequest } from "./typed-request";
import { AuthContext } from "./types/auth.type";

/**
 * Legge l'utente e la sessione messi in `req.auth` da isAuthenticated.
 * Difesa in profondità: se il middleware non è stato montato risponde 401, mai un crash.
 */
export function requireAuth(req: Request): AuthContext {
  const { auth } = req as TypedAuthRequest;
  if (!auth) throw new UnauthorizedError();

  return auth;
}
