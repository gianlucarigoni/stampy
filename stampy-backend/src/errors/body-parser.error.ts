import { NextFunction, Request, Response } from "express";

// Errori di body-parser (JSON malformato, body troppo grande): hanno `type` e `status`
// ma non sono GenericError, quindi senza questo handler finirebbero in un 500.
// Messaggio nostro, mai quello della libreria (riporterebbe pezzi dell'input).
const BODY_ERRORS: Record<string, { status: number; error: string; message: string }> = {
  "entity.parse.failed": { status: 400, error: "MalformedBody", message: "Body JSON non valido" },
  "entity.too.large": { status: 413, error: "BodyTooLarge", message: "Body troppo grande" },
};

export const bodyParserHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const known = BODY_ERRORS[(err as { type?: unknown }).type as string];
  if (known) {
    res.status(known.status);
    res.json({
      error: known.error,
      message: known.message,
    });
  } else {
    next(err);
  }
};
