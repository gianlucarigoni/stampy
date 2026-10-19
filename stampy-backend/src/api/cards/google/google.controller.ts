import { NextFunction, Response } from "express";
import { PromotionExpiredError } from "../../../errors/promotion-expired.error";
import { PromotionNotFoundError } from "../../../errors/promotion-not-found.error";
import { UserNotFoundError } from "../../../errors/user-not-found.error";
import { VenueNotFoundError } from "../../../errors/venue-not-found.error";
import { TypedRequest } from "../../../utils/typed-request";
import { AddGoogleCardDTO } from "./google.dto";
import googleSrv from "./google.service";

export const addGoogleCard = async (req: TypedRequest<AddGoogleCardDTO>, res: Response, next: NextFunction) => {
  try {
    const user = await googleSrv.getUserById(req.body.userId);
    if (!user || user.anonymizedAt != null) throw new UserNotFoundError();

    const venue = await googleSrv.getVenueById(req.body.venueId);
    if (!venue || venue.archivedAt != null) throw new VenueNotFoundError();

    const promotion = await googleSrv.getActivePromotion(req.body.venueId);
    if (!promotion) throw new PromotionNotFoundError();

    const now = new Date();
    if (promotion.startsAt > now || (promotion.endsAt !== null && promotion.endsAt < now))
      throw new PromotionExpiredError();

    const result = await googleSrv.addOrGetCard(req.body.userId, req.body.venueId, promotion.id);
    if (!result || !result.card) {
      throw new Error("Impossibile creare o recuperare la card.");
    }
    const { card, created } = result;

    const loyaltyClass = googleSrv.buildLoyaltyClass(venue);
    const loyaltyObject = googleSrv.buildLoyaltyObject(card, promotion, loyaltyClass.id);

    
    const saveUrl = googleSrv.createSaveUrl(loyaltyClass, loyaltyObject);

    res.status(created ? 201 : 200).json({
      saveUrl,
      publicCode: card.publicCode,
    });
  } catch (err) {
    next(err);
  }
};
