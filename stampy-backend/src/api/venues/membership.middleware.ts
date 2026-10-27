import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../../errors/forbidden.error";
import { requireAuth } from "../../utils/auth-context";
import { MemberRole } from "../../db/types";
import membershipSrv from "./membership.service";

/**
 * Autorizzazione per locale: l'utente deve essere membro di `:venueId` con uno dei
 * ruoli ammessi. Il ruolo si legge da `venue_members` a OGNI richiesta (decisione
 * chiusa): non viene messo in sessione né in `req.auth`.
 *
 * Va montato dopo `isAuthenticated` e prima di `validate(params)` (ordine deciso).
 * Conseguenza accettata: un `venueId` malformato dà 403 (non 400), perché il ruolo
 * viene verificato prima della validazione.
 *
 * I generics sono aperti come in `isAuthenticated`: con `P = ParamsDictionary`
 * fisso il controller tipizzato dal DTO dei params non sarebbe assegnabile.
 */
export const requireRole = (...allowed: MemberRole[]) => {
  return async <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = requireAuth(req);
      const venueId = (req.params as { venueId?: string } | undefined)?.venueId;
      if (!venueId) throw new ForbiddenError();

      const membership = await membershipSrv.getMembership(auth.user.id, venueId);
      if (!membership || !allowed.includes(membership.role)) throw new ForbiddenError();

      next();
    } catch (err) {
      next(err);
    }
  };
};
