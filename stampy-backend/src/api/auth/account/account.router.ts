import { Router } from "express";
import { isAuthenticated } from "../../../utils/middlewares/session.middleware";
import { ipAuthRateLimit } from "../../../utils/middlewares/ip-rate-limit.middleware";
import { validate } from "../../../utils/middlewares/validation.middleware";
import { verifyDTO } from "../email/email.dto";
import { confirmDeletion, requestDeletion } from "./account.controller";

const router = Router();

// Ordine: rate limit -> isAuthenticated -> validate -> controller.
router.use(ipAuthRateLimit);

router.post("/delete/request", isAuthenticated, requestDeletion);
router.post("/delete/confirm", isAuthenticated, validate(verifyDTO, "body"), confirmDeletion);

export default router;
