import { bodyParserHandler } from "./body-parser.error";
import { codeExpiredHandler } from "./code-expired.error";
import { forbiddenHandler } from "./forbidden.error";
import { genericErrorHandler } from "./generic";
import { invalidCodeHandler } from "./invalid-code.error";
import { promotionNotFoundHandler } from "./promotion-not-found.error";
import { RequestNotFoundError, requestNotFoundHandler } from "./request-not-found.error";
import { routeNotFoundHandler } from "./route-not-found.error";
import { tryLaterHandler } from "./try-later.error";
import { unauthorizedHandler } from "./unauthorized.error";
import { validationHandler } from "./validation-error";
import { VenueNotFoundError, venueNotFoundHandler } from "./venue-not-found.error";

export const errorHandlers = [
  bodyParserHandler,
  validationHandler,
  venueNotFoundHandler,
  promotionNotFoundHandler,
  requestNotFoundHandler,
  routeNotFoundHandler,
  tryLaterHandler,
  invalidCodeHandler,
  codeExpiredHandler,
  forbiddenHandler,
  // prima del generico, altrimenti non verrebbe mai raggiunto
  unauthorizedHandler,
  genericErrorHandler,
];
