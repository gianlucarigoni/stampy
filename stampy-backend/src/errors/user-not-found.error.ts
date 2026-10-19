import { NextFunction, Request, Response } from "express";

export class UserNotFoundError extends Error {
  constructor() {
    super();
    this.message = "User not found";
    this.name = "UserNotFound";
  }
}

export const userNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof UserNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
