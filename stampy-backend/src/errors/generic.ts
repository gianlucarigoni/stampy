import { Request, Response, NextFunction } from "express";

export class GenericError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "GenericError";
  }
}

/**
 * Ultimo handler della catena: qui arrivano solo gli errori non previsti dai
 * gestori specifici (ZodError, TypeError, errori del driver, body-parser...).
 *
 * Prima del 27/10/2026 faceva `res.status(err.statusCode)` assumendo che OGNI
 * errore fosse un `GenericError`: un errore senza `statusCode` (es. uno
 * `ZodError` di branding) faceva lanciare Express e il client riceveva una
 * pagina HTML 500 invece del JSON del contratto.
 *
 * Regola: status e messaggio si espongono solo per `GenericError` (scritto da noi
 * con lo status). Per tutto il resto: 500 generico, dettagli solo nei log.
 */
export const genericErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (!(err instanceof GenericError) || !Number.isInteger(err.statusCode)) {
    res.status(500);
    res.json({
      error: "InternalServerError",
      message: "Errore interno",
    });
    return;
  }

  res.status(err.statusCode);
  res.json({
    error: err.name,
    message: err.message,
  });
};
