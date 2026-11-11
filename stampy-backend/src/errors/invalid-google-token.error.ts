import { NextFunction, Request, Response } from "express";

// Token Google non verificabile (firma, audience, scadenza, claim mancanti): un solo messaggio,
// senza i dettagli della libreria.
export class InvalidGoogleTokenError extends Error {
  constructor() {
    super();
    this.message = "Token Google non valido";
    this.name = "InvalidGoogleToken";
  }
}

export const invalidGoogleTokenHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof InvalidGoogleTokenError) {
    res.status(401);
    res.json({ error: err.name, message: err.message });
  } else {
    next(err);
  }
};
