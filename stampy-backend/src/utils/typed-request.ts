import { Request } from "express";
import * as core from "express-serve-static-core";
import { AuthContext } from "./types/auth.type";

export interface TypedRequest<
  B = any,
  Q = core.Query,
  P = core.ParamsDictionary> extends Request<P, any, B, Q> { }

/**
 * Richiesta che ha attraversato isAuthenticated.
 *
 * Il campo si chiama `auth` e non `user` perché @types/passport dichiara già
 * `Express.Request.user?: Express.User` a livello globale (tsconfig non limita `types`):
 * un `user?: AuthUser` renderebbe l'handler non assegnabile ai RequestHandler di Express.
 *
 * `auth` è OPZIONALE: un handler con campo obbligatorio non sarebbe assegnabile a Express.
 * Nei controller si legge con requireAuth(), che garantisce il valore a runtime.
 */
export interface TypedAuthRequest<
  B = any,
  Q = core.Query,
  P = core.ParamsDictionary> extends TypedRequest<B, Q, P> {
  auth?: AuthContext;
}
