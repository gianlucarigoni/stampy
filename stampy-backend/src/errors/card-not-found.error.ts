import { NextFunction, Request, Response } from "express";

export class CardNotFoundError extends Error {
  constructor() {
    super();
    this.message = "Card not found or not created";
    this.name = "CardNotFound";
  }
}

export const cardNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CardNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
