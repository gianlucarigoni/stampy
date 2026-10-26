import { Router } from "express";
import { request, verify } from "./email.controller";
import { validate } from "../../../utils/validation-middleware";
import { emailDTO, verifyDTO } from "./email.dto";

const router = Router();

router.post("/request", validate(emailDTO, "body"), request);
router.post("/verify", validate(verifyDTO, "body"), verify);

export default router;
