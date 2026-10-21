import { Router } from "express";
import { health } from "./health/health.controller";
import cardsRouter from "./cards/cards.router";

const router = Router();

router.get("/health", health);
router.use("/cards", cardsRouter);

export default router;
