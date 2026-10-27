import { NextFunction, Request, Response } from "express";

// Autenticato ma senza il ruolo richiesto su quel locale (venue_members).
// 403 e non 404: l'esistenza del locale non è un segreto (il `visit` già distingue
// locale inesistente da promozione assente) e il messaggio serve allo staff in debug.
export class ForbiddenError extends Error {
  constructor() {
    super();
    this.message = "Non autorizzato";
    this.name = "Forbidden";
  }
}

export const forbiddenHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ForbiddenError) {
    res.status(403);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
