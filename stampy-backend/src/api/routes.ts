import { Router } from "express";
import { healt } from "./healt/healt.controller";
import { addGoogleCard } from "./cards/google/google.controller";
import { validate } from "../utils/validation-middleware";
import { AddGoogleCardDTO } from "./cards/google/google.dto";

const router = Router();

router.get("/healt", healt);
router.post("/cards/google", validate(AddGoogleCardDTO, "body"), addGoogleCard);

export default router;
