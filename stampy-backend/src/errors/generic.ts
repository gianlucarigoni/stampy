import { Request, Response, NextFunction } from "express";

export class GenericError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = "Generic";
  }
}

export const genericErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500);
  res.json({
    error: err.name,
    message: err.message,
  });
};
