import { Router } from "express";
import { health } from "./health/health.controller";
import cardsRouter from "./cards/cards.router";
import venuesRouter from "./venues/venues.router"
import requestsRouter from "./requests/requests.router"

const router = Router();

router.get("/health", health);
router.use("/cards", cardsRouter); //dev

router.use("/venues", venuesRouter)
router.use("/requests", requestsRouter)

export default router;
