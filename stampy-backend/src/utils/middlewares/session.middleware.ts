import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../errors/unauthorized.error";
import { TypedAuthRequest } from "../typed-request";
import sessionSrv, { SESSION_COOKIE_NAME, SESSION_TOKEN_LENGTH } from "../../api/auth/session/session.service";

/**
 * Autenticazione da cookie di sessione. Va montata per rotta (mai su /api/auth in blocco:
 * /email/* deve restare pubblico). In caso di fallimento risponde sempre lo stesso 401.
 *
 * I generics sono aperti: così il middleware non fissa il tipo dei params della rotta e si
 * può combinare con controller tipizzati (`validate(...)` + controller con il DTO dei params).
 */
export const isAuthenticated = async <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    // controllo di forma prima della query: un cookie palesemente fasullo non merita un accesso al DB
    if (typeof token !== "string" || token.length !== SESSION_TOKEN_LENGTH) throw new UnauthorizedError();

    const auth = await sessionSrv.authenticate(token);
    if (!auth) throw new UnauthorizedError();

    const typed = req as unknown as TypedAuthRequest;
    typed.auth = auth;

    next();
  } catch (err) {
    next(err);
  }
};
