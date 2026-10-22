import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import * as jwt from "jsonwebtoken";
import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";
import { db } from "../../../db";
import { cards, promotions, users, venues, walletProvider, walletStatus } from "../../../db/schema";
import { Card } from "../../../utils/types/card.type";
import { Promotion } from "../../../utils/types/promotion.type";
import { User } from "../../../utils/types/users.type";
import { Venue } from "../../../utils/types/venue.type";
import { brandingSchema } from "../../../utils/schemas/branding.schema";
import { env } from "../../../config/env";
import { loadServiceAccount, ServiceAccount } from "../../../config/serviceAccount";

export class GoogleService {
  private readonly credentials: ServiceAccount = loadServiceAccount(
    env.WALLET_SERVICE_ACCOUNT_KEY_PATH,
    env.WALLET_SERVICE_ACCOUNT_EMAIL,
  );

  private publicCodeGenerator = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

  private generatePublicCode(): string {
    return this.publicCodeGenerator();
  }

  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async getVenueById(venueId: string): Promise<Venue | null> {
    const [row] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!row) return null;

    return { ...row, branding: brandingSchema.parse(row.branding) };
  }

  async getActivePromotion(venueId: string): Promise<Promotion | null> {
    const now = new Date();
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.venueId, venueId),
          lte(promotions.startsAt, now),
          or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
        ),
      )
      .limit(1);

    return promotion ?? null;
  }

  async addOrGetCard(userId: string, venueId: string, promotionId: string): Promise<{ card: Card; created: boolean }> {
    const issuerId = env.WALLET_ISSUER_ID;

    const id = randomUUID();
    const walletObjectId = `${issuerId}.${id}`;
    const publicCode = this.generatePublicCode();

    const [card] = await db
      .insert(cards)
      .values({
        id,
        userId,
        venueId,
        promotionId,
        stampsCount: 0,
        publicCode,
        walletProvider: walletProvider.enumValues[0], // "google"
        walletStatus: walletStatus.enumValues[0], // "not_added"
        walletObjectId,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: [cards.userId, cards.venueId] })
      .returning();

    if (card) {
      return { card, created: true };
    }

    const [existingCard] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.venueId, venueId)))
      .limit(1);

    return { card: existingCard, created: false };
  }

  buildLoyaltyClass(venue: Venue) {
    const issuerId = env.WALLET_ISSUER_ID;
    if (!issuerId) {
      throw new Error("WALLET_ISSUER_ID non è configurato.");
    }

    const branding = venue.branding;

    // ID univoco per il modello di questo locale
    const classId = `${issuerId}.${venue.id}`;

    return {
      id: classId,
      issuerName: venue.name,
      programName: venue.name,

      // Logo del locale (Google richiede un URL HTTPS valido)
      programLogo: {
        sourceUri: {
          uri: branding.logoUrl,
        },
        contentDescription: {
          defaultValue: {
            language: "it-IT",
            value: `Logo ${venue.name}`,
          },
        },
      },

      ...(branding.bannerUrl && {
        heroImage: { sourceUri: { uri: branding.bannerUrl } },
      }),

      hexBackgroundColor: branding.backgroundColor,

      // Stato di revisione: 'UNDER_REVIEW' durante i test, 'APPROVED' in produzione
      reviewStatus: "UNDER_REVIEW",
    };
  }

  buildLoyaltyObject(card: Card, promotion: Promotion, classId: string) {
    const config = (promotion.config as { stampsRequired?: number; reward?: string }) || {};

    return {
      id: card.walletObjectId, // L'ID univoco dell'oggetto (es. ISSUER_ID.uuid_card)
      classId,
      state: "ACTIVE",

      // QR Code basato sul publicCode della card (per scansione o identificazione manuale)
      barcode: {
        type: "QR_CODE",
        value: card.publicCode,
        alternateText: card.publicCode,
      },

      // Contatore principale dei timbri mostrato in primo piano nell'app Google Wallet
      loyaltyPoints: {
        label: "Timbri",
        balance: {
          int: card.stampsCount,
        },
        localizedLabel: {
          defaultValue: {
            language: "it-IT",
            value: "Timbri",
          },
        },
      },

      // Moduli di testo dinamici con l'avanzamento dell'utente
      textModulesData: [
        {
          header: "PREMIO",
          body: config.reward,
          id: "reward_info",
        },
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
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
    };

    const token = jwt.sign(claims, this.credentials.privateKey, { algorithm: "RS256" });

    return `https://pay.google.com/gp/v/save/${token}`;
  }
}

export default new GoogleService();
