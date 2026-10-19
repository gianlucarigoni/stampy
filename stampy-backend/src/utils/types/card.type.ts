import { WalletProvider } from "./enum";
import { WalletStatus } from "./enum";

export type Card = {
  id: string;
  userId: string;
  venueId: string;
  promotionId: string;
  stampsCount: number;
  publicCode: string;
  walletProvider: WalletProvider;
  walletObjectId: string;
  walletStatus: WalletStatus;
  createdAt: Date;
};
