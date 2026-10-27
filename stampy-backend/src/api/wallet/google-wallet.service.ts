import * as jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { loadServiceAccount, ServiceAccount } from "../../config/serviceAccount";
import { Card, Promotion, Venue } from "../../db/types";
import { promotionConfigSchema } from "../../utils/schemas/promotion-config.schema";

export class GoogleWalletService {
  private readonly credentials: ServiceAccount = loadServiceAccount(
    env.WALLET_SERVICE_ACCOUNT_KEY_PATH,
    env.WALLET_SERVICE_ACCOUNT_EMAIL,
  );

  // Unico punto che conosce il formato dell'ID object Google.
  buildObjectId(cardId: string): string {
    return `${env.WALLET_ISSUER_ID}.${cardId}`;
  }

  buildLoyaltyClass(venue: Venue) {
    const branding = venue.branding;

    return {
      id: `${env.WALLET_ISSUER_ID}.${venue.id}`,
      issuerName: venue.name,
      programName: venue.name,
      programLogo: {
        sourceUri: { uri: branding.logoUrl },
        contentDescription: {
          defaultValue: { language: "it-IT", value: `Logo ${venue.name}` },
        },
      },
      ...(branding.bannerUrl && { heroImage: { sourceUri: { uri: branding.bannerUrl } } }),
      hexBackgroundColor: branding.backgroundColor,
      reviewStatus: "UNDER_REVIEW", // 'APPROVED' in produzione
    };
  }

  buildLoyaltyObject(card: Card, promotion: Promotion, classId: string) {
    const config = promotionConfigSchema.parse(promotion.config);

    return {
      id: card.walletObjectId,
      classId,
      state: "ACTIVE",
      barcode: { type: "QR_CODE", value: card.publicCode, alternateText: card.publicCode },
      loyaltyPoints: {
        label: "Timbri",
        balance: { int: card.stampsCount },
        localizedLabel: { defaultValue: { language: "it-IT", value: "Timbri" } },
      },
      textModulesData: [
        { header: "PREMIO", body: config.reward, id: "reward_info" },
        {
          header: "MECCANISMO TIMBRI",
          body: `Raccogli ${config.stampsRequired} timbri per riscattare il premio.`,
          id: "stamps_info",
        },
        {
          header: "PROGRESSO",
          body: `${card.stampsCount}/${config.stampsRequired} timbri raccolti`,
          id: "user_progress",
        },
      ],
    };
  }

  createSaveUrl(loyaltyClass: object, loyaltyObject: object): string {
    const claims = {
      iss: this.credentials.clientEmail,
      aud: "google",
      origins: [env.APP_ORIGIN],
      typ: "savetowallet",
      payload: { loyaltyClasses: [loyaltyClass], loyaltyObjects: [loyaltyObject] },
    };
    const token = jwt.sign(claims, this.credentials.privateKey, { algorithm: "RS256" });
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  // Comodo per `visit`: class + object + link in una chiamata.
  buildSaveUrl(venue: Venue, card: Card, promotion: Promotion): string {
    const loyaltyClass = this.buildLoyaltyClass(venue);
    const loyaltyObject = this.buildLoyaltyObject(card, promotion, loyaltyClass.id);
    return this.createSaveUrl(loyaltyClass, loyaltyObject);
  }
}

export default new GoogleWalletService();
