import { and, eq, isNull } from "drizzle-orm";
import { NextFunction, Response } from "express";
import { db } from "../../db";
import { users } from "../../db/schema";
import { UnauthorizedError } from "../../errors/unauthorized.error";
import { displayNameDTO } from "./auth.dto";
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

// Imposta o modifica il proprio nome visualizzato. Nessun evento in auth_events: il nome è un dato
// personale. L'UPDATE riguarda solo l'utente della sessione e solo se non è anonimizzato.
export const updateMe = async (req: TypedAuthRequest<displayNameDTO>, res: Response, next: NextFunction) => {
  try {
    const { user } = requireAuth(req);

    const [updated] = await db
      .update(users)
      .set({ displayName: req.body.displayName })
      .where(and(eq(users.id, user.id), isNull(users.anonymizedAt)))
      .returning({ id: users.id, email: users.email, displayName: users.displayName });
    if (!updated) throw new UnauthorizedError();

    res.status(200).json({ user: { id: updated.id, email: updated.email, displayName: updated.displayName } });
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
