import { NextFunction, Request, Response } from "express";

export class RequestNotFoundError extends Error {
  constructor() {
    super();
    this.message = "Request not found";
    this.name = "RequestNotFound";
  }
}

export const requestNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof RequestNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
