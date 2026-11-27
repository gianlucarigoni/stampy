import { NextFunction, Response } from "express";
import { requireAuth } from "../../utils/auth-context";
import { promotionConfigSchema } from "../../utils/schemas/promotion-config.schema";
import { TypedAuthRequest } from "../../utils/typed-request";
import googleWalletSrv from "../wallet/wallet.service";
import cardsSrv from "./cards.service";

export const mine = async (req: TypedAuthRequest, res: Response, next: NextFunction) => {
  const userId = requireAuth(req).user.id;
  try {
    const rows = await cardsSrv.getUserCards(userId);
    const list = rows.map(({ card, venue, promotion }) => {
      const { logoUrl, backgroundColor, bannerUrl } = venue.branding;
      const branding = { logoUrl, backgroundColor, ...(bannerUrl && { bannerUrl }) };
      const base = { venueId: venue.id, venueName: venue.name, branding, walletStatus: card.walletStatus };

      // Senza promozione attiva non c'è nulla da salvare nel Wallet: la voce resta, senza link.
      if (!promotion) return { ...base, stampsCount: card.stampsCount, stampsRequired: 0, saveUrl: null };

      // Card ferma su una promozione non più attiva: il pass mostra 0 timbri, come in `visit`.
      const shown = card.promotionId !== promotion.id ? { ...card, stampsCount: 0 } : card;
      const loyaltyClass = googleWalletSrv.buildLoyaltyClass(venue);
      const loyaltyObject = googleWalletSrv.buildLoyaltyObject(shown, promotion, loyaltyClass.id);
      return {
        ...base,
        stampsCount: shown.stampsCount,
        stampsRequired: promotionConfigSchema.parse(promotion.config).stampsRequired,
        saveUrl: googleWalletSrv.createSaveUrl(loyaltyClass, loyaltyObject),
      };
    });
    res.status(200).json({ cards: list });
  } catch (err) {
    next(err);
  }
};
