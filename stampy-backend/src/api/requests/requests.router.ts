import { Router } from "express";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";
import { validate } from "../../utils/middlewares/validation.middleware";
import { find } from "./requests.controller";
import { requestIdDTO } from "./requests.dto";

const router = Router();

// Ordine deciso: autenticazione -> validazione dei params -> controller.
router.get("/:requestId", isAuthenticated, validate(requestIdDTO, "params"), find);

export default router;
