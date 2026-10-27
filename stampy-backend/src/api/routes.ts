import { Router } from "express";
import { health } from "./health/health.controller";
import venuesRouter from "./venues/venues.router";
import requestsRouter from "./requests/requests.router";
import authRouter from "./auth/auth.router";

const router = Router();

router.get("/health", health);

router.use("/auth", authRouter);

router.use("/venues", venuesRouter);
router.use("/requests", requestsRouter);

export default router;
