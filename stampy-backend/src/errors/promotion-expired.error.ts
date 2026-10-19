import { NextFunction, Request, Response } from "express";

export class PromotionExpiredError extends Error {
  constructor() {
    super();
    this.message = "Promotion expired";
    this.name = "PromotionExpired";
  }
}

export const promotionExpiredHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof PromotionExpiredError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
