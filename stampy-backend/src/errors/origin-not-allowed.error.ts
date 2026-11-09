import { NextFunction, Request, Response } from "express";

// Richiesta che cambia stato da un'origin diversa da APP_ORIGIN (difesa CSRF, vedi BACKLOG B3).
// Messaggio generico: non rivela quale sia l'origin attesa.
export class OriginNotAllowedError extends Error {
  constructor() {
    super();
    this.message = "Origine non consentita";
    this.name = "OriginNotAllowed";
  }
}

export const originNotAllowedHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof OriginNotAllowedError) {
    res.status(403);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
