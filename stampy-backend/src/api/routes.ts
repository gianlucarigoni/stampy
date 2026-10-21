import { Router } from "express";
import { health } from "./health/health.controller";
import cardsRouter from "./cards/cards.router";

const router = Router();

router.get("/healt", health);
router.use("/cards", cardsRouter);

export default router;
