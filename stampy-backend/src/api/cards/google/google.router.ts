import { Router } from "express";
import { AddGoogleCardDTO } from "./google.dto";
import { validate } from "../../../utils/validation-middleware";
import { addGoogleCard } from "./google.controller"

const router = Router();

// google weallet
router.post("/", validate(AddGoogleCardDTO, "body"), addGoogleCard)

export default router;
