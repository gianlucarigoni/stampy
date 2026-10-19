import { genericErrorHandler } from "./generic";
import { promotionExpiredHandler } from "./promotion-expired.error";
import { promotionNotFoundHandler } from "./promotion-not-found.error";
import { userNotFoundHandler } from "./user-not-found.error";
import { VenueNotFoundError, venueNotFoundHandler } from "./venue-not-found.error";

export const errorHandlers = [
  userNotFoundHandler,
  venueNotFoundHandler,
  promotionNotFoundHandler,
  promotionExpiredHandler,
  genericErrorHandler,
];
