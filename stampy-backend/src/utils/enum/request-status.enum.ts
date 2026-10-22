// export const requestStatus = pgEnum("request_status", ["pending", "approved", "rejected", "expired"]);
export enum RequestStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
  expired = "expired",
}
