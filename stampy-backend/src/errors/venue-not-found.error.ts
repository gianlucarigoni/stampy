import { NextFunction, Request, Response } from "express";

export class VenueNotFoundError extends Error {
  constructor() {
    super();
    this.message = "Venue not found";
    this.name = "VenueNotFound";
  }
}

export const venueNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof VenueNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
