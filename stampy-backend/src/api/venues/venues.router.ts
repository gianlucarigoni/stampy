import { Router } from "express";
import { visit } from "./venues.controller";

const router = Router();

router.post("/:venueId/visit", visit);

export default router;
