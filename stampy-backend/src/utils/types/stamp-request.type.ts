export type StampRequest = {
  id: string;
  cardId: string;
  venueId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
};
