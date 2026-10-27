import { Router } from "express";
import { request, verify } from "./email.controller";
import { validate } from "../../../utils/validation-middleware";
import { emailDTO, verifyDTO } from "./email.dto";
import { ipAuthRateLimit } from "../ip-rate-limit.middleware";

const router = Router();

// Limiter IP solo su queste rotte (non su /me e /logout, chiamate spesso dal frontend).
// In sviluppo è un pass-through: vedi ip-rate-limit.middleware.ts.
router.use(ipAuthRateLimit);

router.post("/request", validate(emailDTO, "body"), request);
router.post("/verify", validate(verifyDTO, "body"), verify);

export default router;
