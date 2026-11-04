import { Router } from "express";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";
import { validate } from "../../utils/middlewares/validation.middleware";
import { historyQueryDTO } from "../venues/staff/staff.dto";
import { find, mine } from "./requests.controller";
import { requestIdDTO } from "./requests.dto";

const router = Router();

// Rotta fissa prima di `/:requestId`: "mine" non è un UUID.
router.get("/mine", isAuthenticated, validate(historyQueryDTO, "query"), mine);

// Ordine deciso: autenticazione -> validazione dei params -> controller.
router.get("/:requestId", isAuthenticated, validate(requestIdDTO, "params"), find);

export default router;
