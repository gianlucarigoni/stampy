import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../errors/unauthorized.error";
import { TypedAuthRequest } from "../../utils/typed-request";
import sessionSrv, { SESSION_COOKIE_NAME, SESSION_TOKEN_LENGTH } from "./session.service";

/**
 * Autenticazione da cookie di sessione. Va montata per rotta (mai su /api/auth in blocco:
 * /email/* deve restare pubblico). In caso di fallimento risponde sempre lo stesso 401.
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    // controllo di forma prima della query: un cookie palesemente fasullo non merita un accesso al DB
    if (typeof token !== "string" || token.length !== SESSION_TOKEN_LENGTH) throw new UnauthorizedError();

    const auth = await sessionSrv.authenticate(token);
    if (!auth) throw new UnauthorizedError();

    const typed = req as TypedAuthRequest;
    typed.auth = auth;

    next();
  } catch (err) {
    next(err);
  }
};
