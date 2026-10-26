import { authEvents, authEventType, otpChallenges, otpChannel, walletProvider, walletStatus } from "../../db/schema";

export enum PromotionType {
  stamps = "stamps",
}

export type WalletProvider = (typeof walletProvider.enumValues)[number];
export type WalletStatus = (typeof walletStatus.enumValues)[number];
export type OtpChannel = (typeof otpChannel.enumValues)[number];
export type AuthEventType = (typeof authEventType.enumValues)[number];
