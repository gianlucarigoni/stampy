import { Router } from "express";
import { visit } from "./venues.controller";
import { validate } from "../../utils/validation-middleware";
import { venueIdDTO } from "./venues.dto";

const router = Router();

router.post("/:venueId/visit", validate(venueIdDTO, "params"), visit);

export default router;
