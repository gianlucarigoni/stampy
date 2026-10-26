import { NextFunction, Request, Response } from "express";

export class TryLaterError extends Error {
  constructor() {
    super();
    this.message = "Try again later";
    this.name = "TryLaterFound";
  }
}

export const tryLaterHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof TryLaterError) {
    res.status(429);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
