import jwt from "jsonwebtoken";
import type { CreateSaveLinkInput, WalletProvider } from "../walletProvider.js";
import { buildLoyaltyClass, buildLoyaltyObject } from "./passTemplates.js";

export interface GoogleWalletConfig {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
  logoUrl: string;
}

export class GoogleWalletProvider implements WalletProvider {
  constructor(private readonly cfg: GoogleWalletConfig) {}

  async createSaveLink(input: CreateSaveLinkInput): Promise<string> {
    const walletClass = buildLoyaltyClass(this.cfg.issuerId, this.cfg.logoUrl, input);
    const walletObject = buildLoyaltyObject(this.cfg.issuerId, input);

    const claims = {
      iss: this.cfg.serviceAccountEmail,
      aud: "google",
      typ: "savetowallet",
      origins: [],
      payload: {
        loyaltyClasses: [walletClass],
        loyaltyObjects: [walletObject],
      },
    };

    // iat viene aggiunto da jsonwebtoken
    const token = jwt.sign(claims, this.cfg.privateKey, { algorithm: "RS256" });
    return `https://pay.google.com/gp/v/save/${token}`;
  }
}
