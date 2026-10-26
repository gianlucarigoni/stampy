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

export const genericErrorHandler = (err: GenericError, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.statusCode);
  res.json({
    error: err.name,
    message: err.message,
  });
};
