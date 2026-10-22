import { Card } from "../../db/schema";

export type VisitResponse =
  | {
      state: string;
      requestId: string;
      expiresAt: string;
    }
  | {
      state: string;
      card: Card;
      public_code: string;
    };
