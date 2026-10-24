import { cardNotFoundHandler } from "./card-not-found.error";
import { genericErrorHandler } from "./generic";
import { promotionExpiredHandler } from "./promotion-expired.error";
import { promotionNotFoundHandler } from "./promotion-not-found.error";
import { RequestNotFoundError, requestNotFoundHandler } from "./request-not-found.error";
import { userNotFoundHandler } from "./user-not-found.error";
import { validationHandler } from "./validation-error";
import { VenueNotFoundError, venueNotFoundHandler } from "./venue-not-found.error";

export const errorHandlers = [
  validationHandler,
  userNotFoundHandler,
  venueNotFoundHandler,
  cardNotFoundHandler,
  promotionNotFoundHandler,
  promotionExpiredHandler,
  requestNotFoundHandler,
  genericErrorHandler,
];
