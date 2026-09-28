import type { CreateSaveLinkInput } from "../walletProvider.js";

const safeId = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_");

export const classIdFor = (issuerId: string, venueId: string) => `${issuerId}.venue_${safeId(venueId)}`;

export const objectIdFor = (issuerId: string, cardId: string) => `${issuerId}.card_${safeId(cardId)}`;

export function buildLoyaltyClass(issuerId: string, logoUrl: string, input: CreateSaveLinkInput) {
  return {
    id: classIdFor(issuerId, input.venueId),
    issuerName: input.venueName,
    reviewStatus: "UNDER_REVIEW",
    programName: `${input.venueName} - Tessera fedeltà`,
    programLogo: {
      sourceUri: { uri: logoUrl },
      contentDescription: {
        defaultValue: { language: "it-IT", value: `Logo ${input.venueName}` },
      },
    },
    hexBackgroundColor: "#1f6f5c",
  };
}

export function buildLoyaltyObject(issuerId: string, input: CreateSaveLinkInput) {
  return {
    id: objectIdFor(issuerId, input.cardId),
    classId: classIdFor(issuerId, input.venueId),
    state: "ACTIVE",
    accountId: input.cardId,
    accountName: input.holderName,
    loyaltyPoints: {
      label: "Timbri",
      balance: { string: `${input.stamps}/${input.stampsRequired}` },
    },
  };
}
