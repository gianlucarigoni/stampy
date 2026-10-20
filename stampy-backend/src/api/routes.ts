import { Router } from "express";
import { healt } from "./healt/healt.controller";
import cardsRouter from "./cards/cards.router";

const router = Router();

router.get("/healt", healt);
router.use("/cards", cardsRouter);

export default router;
