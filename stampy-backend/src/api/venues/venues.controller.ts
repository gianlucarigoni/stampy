import { NextFunction, Response } from "express";
import { CardNotFoundError } from "../../errors/card-not-found.error";
import { GenericError } from "../../errors/generic";
import { PromotionNotFoundError } from "../../errors/promotion-not-found.error";
import { UserNotFoundError } from "../../errors/user-not-found.error";
import { VenueNotFoundError } from "../../errors/venue-not-found.error";
import { TypedRequest } from "../../utils/typed-request";
import googleSrv from "../cards/google/google.service";
import requestSrv from "../requests/requests.service";
import userSrv from "../users/users.service";
import { userIdDTO, venueIdDTO } from "./venues.dto";
import venueSrv from "./venues.service";

export const VISIT_STATES = ["card_created", "request_pending"] as const;
export type VisitState = (typeof VISIT_STATES)[number];

export const visit = async (req: TypedRequest<userIdDTO, unknown, venueIdDTO>, res: Response, next: NextFunction) => {
  const userId = req.body.userId;
  const venueId = req.params.venueId;

  try {
    const user = await userSrv.getUserById(userId);
    if (!user || user.anonymizedAt != null) throw new UserNotFoundError();

    const venue = await venueSrv.getVenueById(venueId);
    if (!venue) throw new VenueNotFoundError();

    const promotion = await venueSrv.getActivePromotion(venueId);
    if (!promotion) throw new PromotionNotFoundError();

    const result = await googleSrv.addOrGetCard(userId, venueId, promotion.id);
    if (!result || !result.card) throw new CardNotFoundError();

    const { card, created } = result;

    if (created) {
      const loyaltyClass = googleSrv.buildLoyaltyClass(venue);
      const loyaltyObject = googleSrv.buildLoyaltyObject(card, promotion, loyaltyClass.id);

      const saveUrl = googleSrv.createSaveUrl(loyaltyClass, loyaltyObject);

      res.status(201).json({
        state: VISIT_STATES[0],
        saveUrl,
        publicCode: card.publicCode,
      });
    } else {
      await requestSrv.expirePendingRequest(card.id);

      const newRequest = await requestSrv.newRequest(card.id, venueId);
      if (!newRequest) {
        const pending = await requestSrv.getPendingRequest(card.id);
        if (!pending) throw new GenericError("Errore nella richiesta, riprova", 409);
        res.status(200).json({ state: VISIT_STATES[1], requestId: pending.id, expiresAt: pending.expiresAt });
        return;
      }

      res.status(201).json({ state: VISIT_STATES[1], requestId: newRequest.id, expiresAt: newRequest.expiresAt });
    }
  } catch (err) {
    next(err);
  }
};
