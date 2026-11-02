import { NextFunction, Request, Response } from "express";

// Codice sbagliato su una sfida ancora viva. `attemptsRemaining` = tentativi che restano
// (0 = era l'ultimo: la sfida è stata chiusa, serve un nuovo codice). Solo chi possiede il
// challengeId lo riceve; non rivela nulla sull'esistenza dell'email.
export class InvalidCodeError extends Error {
  constructor(public readonly attemptsRemaining: number) {
    super();
    this.message = "Codice non valido";
    this.name = "InvalidCode";
  }
}

export const invalidCodeHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof InvalidCodeError) {
    res.status(400);
    res.json({
      error: err.name,
      message: err.message,
      attemptsRemaining: err.attemptsRemaining,
    });
  } else {
    next(err);
  }
};
