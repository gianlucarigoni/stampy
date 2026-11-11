import { NextFunction, Request, Response } from "express";

// Google non garantisce l'indirizzo, oppure collegarlo a un utente esistente non è consentito:
// l'unica via d'uscita è il codice via email.
export class GoogleEmailRejectedError extends Error {
  constructor() {
    super();
    this.message = "Accesso con Google non consentito per questo indirizzo: usa il codice via email";
    this.name = "GoogleEmailRejected";
  }
}

export const googleEmailRejectedHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof GoogleEmailRejectedError) {
    res.status(403);
    res.json({ error: err.name, message: err.message });
  } else {
    next(err);
  }
};
