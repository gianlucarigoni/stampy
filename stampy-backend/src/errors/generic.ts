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

export const genericErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500);
  res.json({
    error: err.name,
    message: err.message,
  });
};
