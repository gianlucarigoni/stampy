import { NextFunction, Response } from "express";
import { GenericError } from "../../errors/generic";
import { PromotionNotFoundError } from "../../errors/promotion-not-found.error";
import { TryLaterError } from "../../errors/try-later.error";
import { VenueNotFoundError } from "../../errors/venue-not-found.error";
import { requireAuth } from "../../utils/auth-context";
import { TypedAuthRequest } from "../../utils/typed-request";
import cardsSrv from "../cards/cards.service";
import googleWalletSrv from "../wallet/wallet.service";
import requestSrv from "../requests/requests.service";
import membershipSrv from "./membership/membership.service";
import { venueIdDTO } from "./venues.dto";
import venueSrv from "./venues.service";

export const VISIT_STATES = ["card_created", "request_pending"] as const;
export type VisitState = (typeof VISIT_STATES)[number];

export const visit = async (req: TypedAuthRequest<unknown, unknown, venueIdDTO>, res: Response, next: NextFunction) => {
  // L'utente viene dalla sessione (isAuthenticated l'ha già verificato: esiste, non è
  // anonimizzato, sessione valida). Il body non contiene più userId.
  const userId = requireAuth(req).user.id;
  const venueId = req.params.venueId;

  try {
    const venue = await venueSrv.getVenueById(venueId);
    if (!venue) throw new VenueNotFoundError();

    const promotion = await venueSrv.getActivePromotion(venueId);
    if (!promotion) throw new PromotionNotFoundError();

    const { card, created } = await cardsSrv.addOrGetCard(userId, venueId, promotion.id);

    const loyaltyClass = googleWalletSrv.buildLoyaltyClass(venue);
    const loyaltyObject = googleWalletSrv.buildLoyaltyObject(card, promotion, loyaltyClass.id);

    if (created) {
      const saveUrl = googleWalletSrv.createSaveUrl(loyaltyClass, loyaltyObject);

      res.status(201).json({ state: VISIT_STATES[0], saveUrl, publicCode: card.publicCode });
      return;
    }

    await requestSrv.expirePendingRequest(card.id);

    // Richiesta ancora viva: la si restituisce senza consumare quota.
    // (un ritocco mentre la pendente è viva è idempotente e non è un nuovo arrivo in coda)
    const pending = await requestSrv.getPendingRequest(card.id);
    if (pending) {
      res.status(200).json({ state: VISIT_STATES[1], requestId: pending.id, expiresAt: pending.expiresAt });
      return;
    }

    // Rate limit sulle richieste NUOVE: contatori nel DB per card, nessun cooldown
    // (dopo un rifiuto o una scadenza il cliente deve poter rifare subito il tocco).
    const rate = await requestSrv.checkCardRateLimit(card.id);
    if (!rate.allowed) {
      throw new TryLaterError(rate.retryAfterSeconds);
    }

    const newRequest = await requestSrv.newRequest(card.id, venueId);
    if (!newRequest) {
      // race: un altro tocco ha creato la pendente nello stesso istante
      const raced = await requestSrv.getPendingRequest(card.id);
      if (!raced) throw new GenericError("Errore nella richiesta, riprova", 409);
      res.status(200).json({ state: VISIT_STATES[1], requestId: raced.id, expiresAt: raced.expiresAt });
      return;
    }

    res.status(201).json({ state: VISIT_STATES[1], requestId: newRequest.id, expiresAt: newRequest.expiresAt });
  } catch (err) {
    next(err);
  }
};

/**
 * Locali in cui l'utente di sessione è membro (con il ruolo).
 * Serve al frontend staff per sapere quale locale aprire: il `venueId` sta nell'URL,
 * ma l'utente può essere membro di più locali.
 */
export const mine = async (req: TypedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireAuth(req).user.id;
    const venues = await membershipSrv.listVenuesOfUser(userId);
    res.status(200).json({ venues });
  } catch (err) {
    next(err);
  }
};
