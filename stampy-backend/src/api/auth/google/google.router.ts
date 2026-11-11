import { Router } from "express";
import { login } from "./google.controller";
import { validate } from "../../../utils/middlewares/validation.middleware";
import { googleLoginDTO } from "./google.dto";
import { ipAuthRateLimit } from "../../../utils/middlewares/ip-rate-limit.middleware";

const router = Router();

// Ordine: rate limit -> validate(body) -> controller (rotta pubblica: niente sessione né ruoli).
router.post("/", ipAuthRateLimit, validate(googleLoginDTO, "body"), login);

export default router;
