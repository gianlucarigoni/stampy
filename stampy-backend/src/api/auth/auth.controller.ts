import { NextFunction, Response } from "express";
import { db } from "../../db";
import { requireAuth } from "../../utils/auth-context";
import { TypedAuthRequest } from "../../utils/typed-request";
import authEventsSrv from "./auth-events/auth-events.service";
import sessionSrv, { SESSION_COOKIE_NAME, sessionCookieOptions } from "./session/session.service";

// Utente della sessione corrente. Sonda read-only per il frontend e per i test.
export const me = async (req: TypedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user } = requireAuth(req);

    res.status(200).json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
};

// Revoca la sessione corrente (solo questa: "esci da tutti i dispositivi" è fuori ambito).
// Revoca ed evento stanno nella stessa transazione; l'evento si scrive solo se la revoca è avvenuta.
export const logout = async (req: TypedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user, session } = requireAuth(req);

    await db.transaction(async (tx) => {
      const revoked = await sessionSrv.revoke(session.id, tx);
      if (revoked) await authEventsSrv.log("logout", { userId: user.id, provider: session.authProvider }, tx);
    });

    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
