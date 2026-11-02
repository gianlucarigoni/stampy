import { NextFunction, Request, Response } from "express";

// La sfida non è più utilizzabile: scaduta (DB now() > expires_at), tentativi esauriti,
// già usata, sostituita da un nuovo invio o inesistente. In tutti i casi l'unica via
// d'uscita è chiedere un nuovo codice.
export class CodeExpiredError extends Error {
  constructor() {
    super();
    this.message = "Codice scaduto";
    this.name = "CodeExpired";
  }
}

export const codeExpiredHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CodeExpiredError) {
    res.status(400);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
