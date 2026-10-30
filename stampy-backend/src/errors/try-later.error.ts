import { NextFunction, Request, Response } from "express";

// 429 unico per tutti i limiti (OTP, visit, limiter IP): l'header Retry-After e il campo
// retryAfterSeconds portano lo stesso valore, così il frontend non dipende dagli header
// esposti dal CORS.
export class TryLaterError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super();
    this.message = "Riprova più tardi";
    this.name = "TryLaterError";
  }
}

export const tryLaterHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof TryLaterError) {
    res.set("Retry-After", String(err.retryAfterSeconds));
    res.status(429);
    res.json({
      error: err.name,
      message: err.message,
      retryAfterSeconds: err.retryAfterSeconds,
    });
  } else {
    next(err);
  }
};
