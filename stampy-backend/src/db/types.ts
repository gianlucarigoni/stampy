import { authIdentities, cards, otpChallenges, promotions, sessions, stampRequests, users, venues } from "./schema";
import { Branding } from "../utils/schemas/branding.schema";

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type StampRequest = typeof stampRequests.$inferSelect;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuthIdentity = typeof authIdentities.$inferSelect;

// branding è jsonb nel DB: qui è già validato da brandingSchema
export type Venue = Omit<typeof venues.$inferSelect, "branding"> & { branding: Branding };
