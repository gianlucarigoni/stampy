import { NextFunction, Request, Response } from "express";
import { GenericError } from "./generic";

/** Perché una richiesta di timbro non è più risolvibile (stato della riga). */
export type RequestNotValidReason = "expired" | "approved" | "rejected";

/** 409 «Richiesta non più valida» di confirm/reject: `message` invariato, `reason` additivo. */
export class RequestNotValidError extends GenericError {
  constructor(public readonly reason: RequestNotValidReason) {
    super("Richiesta non più valida", 409);
  }
}

export const requestNotValidHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof RequestNotValidError) {
    res.status(409);
    res.json({ error: err.name, message: err.message, reason: err.reason });
  } else {
    next(err);
  }
};
