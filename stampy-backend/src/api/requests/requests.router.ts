import { Router } from "express";
import { isAuthenticated } from "../auth/session.middleware";
import { validate } from "../../utils/validation-middleware";
import { find } from "./requests.controller";
import { requestIdDTO } from "./requests.dto";

const router = Router();

// Ordine deciso: autenticazione -> validazione dei params -> controller.
router.get("/:requestId", isAuthenticated, validate(requestIdDTO, "params"), find);

export default router;
