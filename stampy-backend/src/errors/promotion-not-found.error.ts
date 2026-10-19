import { NextFunction, Request, Response } from "express";

export class PromotionNotFoundError extends Error {
  constructor() {
    super();
    this.message = "Promotion not found";
    this.name = "PromotionNotFound";
  }
}

export const promotionNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof PromotionNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
