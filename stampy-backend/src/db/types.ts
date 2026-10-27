import { Branding } from "../utils/schemas/branding.schema";
import {
  authEventType,
  authIdentities,
  cards,
  identityProvider,
  memberRole,
  otpChallenges,
  otpChannel,
  promotions,
  promotionType,
  requestStatus,
  sessions,
  stampRequests,
  users,
  venues,
  walletProvider,
  walletStatus,
} from "./schema";

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type StampRequest = typeof stampRequests.$inferSelect;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuthIdentity = typeof authIdentities.$inferSelect;

// branding è jsonb nel DB: qui è già validato da brandingSchema
export type Venue = Omit<typeof venues.$inferSelect, "branding"> & { branding: Branding };

export type WalletProvider = (typeof walletProvider.enumValues)[number];
export type WalletStatus = (typeof walletStatus.enumValues)[number];
export type OtpChannel = (typeof otpChannel.enumValues)[number];
export type AuthEventType = (typeof authEventType.enumValues)[number];
export type IdentityProvider = (typeof identityProvider.enumValues)[number];
export type MemberRole = (typeof memberRole.enumValues)[number];
export type PromotionType = (typeof promotionType.enumValues)[number];

// Oggetto con gli stessi nomi dell'ex enum TS: RequestStatus.pending === "pending".
// Derivato dal pgEnum: se si aggiunge un valore nello schema, il tipo lo segue.
export type RequestStatus = (typeof requestStatus.enumValues)[number];
export const RequestStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  expired: "expired",
} as const satisfies Record<RequestStatus, RequestStatus>;
