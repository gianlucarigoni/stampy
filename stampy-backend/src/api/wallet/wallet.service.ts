import * as jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { loadServiceAccount, ServiceAccount } from "../../config/serviceAccount";
import { Card, Promotion, Venue } from "../../db/types";
import { promotionConfigSchema } from "../../utils/schemas/promotion-config.schema";
import { GoogleAuth } from "google-auth-library";

const WALLET_TIMEOUT_MS = 5000;
const WALLET_RETRIES = 2;

export class GoogleWalletService {
  private readonly baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";

  private readonly credentials: ServiceAccount = loadServiceAccount(
    env.WALLET_SERVICE_ACCOUNT_KEY_PATH,
    env.WALLET_SERVICE_ACCOUNT_EMAIL,
  );

  private readonly auth = new GoogleAuth({
    credentials: {
      client_email: this.credentials.clientEmail,
      private_key: this.credentials.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });

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

  async updateCard(card: Card, promotion: Promotion, venue: Venue) {
    const loyaltyClass = this.buildLoyaltyClass(venue);
    const { loyaltyPoints, textModulesData } = this.buildLoyaltyObject(card, promotion, loyaltyClass.id);
    const url = `${this.baseUrl}/loyaltyObject/${encodeURIComponent(card.walletObjectId)}`;
    // Il PATCH porta valori assoluti (non incrementi): ripeterlo è sicuro, quindi un retry
    // sugli errori transitori (5xx/429) non può falsare il saldo. Il 404 non si ritenta.
    await this.auth.request({
      url,
      method: "PATCH",
      data: { loyaltyPoints, textModulesData },
      timeout: WALLET_TIMEOUT_MS,
      retryConfig: { retry: WALLET_RETRIES, httpMethodsToRetry: ["PATCH"] },
    });
  }
}

export default new GoogleWalletService();
