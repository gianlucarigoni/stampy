import { NextFunction, Request, Response } from "express";

// Rotta /api inesistente: JSON come ogni altro errore, invece della pagina HTML di Express.
export class RouteNotFoundError extends Error {
  constructor() {
    super();
    this.message = "Risorsa non trovata";
    this.name = "NotFound";
  }
}

export const routeNotFoundHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof RouteNotFoundError) {
    res.status(404);
    res.json({
      error: err.name,
      message: err.message,
    });
  } else {
    next(err);
  }
};
