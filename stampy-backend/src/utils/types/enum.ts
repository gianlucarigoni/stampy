import { walletProvider, walletStatus } from "../../db/schema";

export enum PromotionType {
  stamps = "stamps",
}

export type WalletProvider = (typeof walletProvider.enumValues)[number];
export type WalletStatus = (typeof walletStatus.enumValues)[number];
