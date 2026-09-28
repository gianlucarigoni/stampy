export interface CreateSaveLinkInput {
  cardId: string;
  venueId: string;
  venueName: string;
  holderName: string;
  stamps: number;
  stampsRequired: number;
}

/** Contratto astratto: oggi solo Google, domani anche Apple (§4.6). */
export interface WalletProvider {
  createSaveLink(input: CreateSaveLinkInput): Promise<string>;
}
