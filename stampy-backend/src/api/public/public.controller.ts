import { NextFunction, Request, Response } from "express";
import { isUUID } from "class-validator";
import { VenueNotFoundError } from "../../errors/venue-not-found.error";
import publicService from "./public.service";

/**
 * GET /api/public/venues/:venueId: non autenticato, risponde solo `{ name }`.
 * Il formato non valido NON passa da `validate` (darebbe 400): stesso 404 dell'inesistente,
 * così non si distinguono i due casi e Postgres non vede mai un UUID invalido.
 */
export async function venueName(req: Request, res: Response, next: NextFunction) {
  try {
    const venueId = req.params.venueId;
    if (typeof venueId !== "string" || !isUUID(venueId)) throw new VenueNotFoundError();
    res.json({ name: await publicService.venueName(venueId) });
  } catch (err) {
    next(err);
  }
}
