import { Router } from "express";
import { isAuthenticated } from "../auth/session.middleware";
import { visit } from "./venues.controller";
import { validate } from "../../utils/validation-middleware";
import { venueIdDTO } from "./venues.dto";

const router = Router();

// Ordine deciso: autenticazione -> validazione dei params -> controller.
router.post("/:venueId/visit", isAuthenticated, validate(venueIdDTO, "params"), visit);

export default router;
