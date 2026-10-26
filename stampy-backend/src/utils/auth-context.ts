import { Request } from "express";
import { UnauthorizedError } from "../errors/unauthorized.error";
import { TypedAuthRequest } from "./typed-request";
import { AuthContext } from "./types/auth.type";

/**
 * Legge l'utente e la sessione messi in `req.auth` da isAuthenticated.
 * Difesa in profondità: se il middleware non è stato montato risponde 401, mai un crash.
 *
 * Il generic su P permette di passare un controller con i params tipizzati dal DTO
 * (`TypedAuthRequest<unknown, unknown, venueIdDTO>`) senza cast al chiamante.
 */
export function requireAuth<P = any>(req: Request<P, any, any, any>): AuthContext {
  const { auth } = req as unknown as TypedAuthRequest;
  if (!auth) throw new UnauthorizedError();

  return auth;
}
