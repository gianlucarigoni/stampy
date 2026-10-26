import { NextFunction, Request, Response } from "express";

// Unico messaggio per ogni fallimento dell'autenticazione: nessuna distinzione tra
// cookie assente, alterato, scaduto, revocato, utente anonimizzato o tetto superato.
export class UnauthorizedError extends Error {
  constructor() {
    super();
    this.message = "Non autenticato";
    this.name = "Unauthorized";
  }
}

export const unauthorizedHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof UnauthorizedError) {
    // Nessun console.error: i 401 sono traffico normale (cookie scaduto), non incidenti.
    res.status(401);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
