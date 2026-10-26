export type OtpChallenge = {
  id: string;
  channel: string;
  destination: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  invalidatedAt: Date | null;
  createdAt: Date;
};
