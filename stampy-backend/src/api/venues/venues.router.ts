import { Router } from "express";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";
import { validate } from "../../utils/middlewares/validation.middleware";
import { requireRole } from "../../utils/middlewares/membership.middleware";
import { confirmDTO, staffRequestParamsDTO } from "./staff/staff.dto";
import { confirm, queue, reject } from "./staff/staff.controller";
import { mine, visit } from "./venues.controller";
import { venueIdDTO } from "./venues.dto";

const router = Router();

// Ordine deciso: autenticazione -> ruolo -> validazione params -> validazione body -> controller.
router.get("/mine", isAuthenticated, mine);

router.post("/:venueId/visit", isAuthenticated, validate(venueIdDTO, "params"), visit);

// --- staff: solo owner/staff del locale, mai ruoli presi da body o sessione ---
router.get("/:venueId/requests", isAuthenticated, requireRole("owner", "staff"), validate(venueIdDTO, "params"), queue);

router.post(
  "/:venueId/requests/:requestId/confirm",
  isAuthenticated,
  requireRole("owner", "staff"),
  validate(staffRequestParamsDTO, "params"),
  validate(confirmDTO, "body"),
  confirm,
);

router.post(
  "/:venueId/requests/:requestId/reject",
  isAuthenticated,
  requireRole("owner", "staff"),
  validate(staffRequestParamsDTO, "params"),
  reject,
);

export default router;
