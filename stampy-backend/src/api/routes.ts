import { Router } from "express";
import healthRouter from "./health/health.router";
import venuesRouter from "./venues/venues.router";
import requestsRouter from "./requests/requests.router";
import authRouter from "./auth/auth.router";

const router = Router();

router.use("/health", healthRouter);

router.use("/auth", authRouter);

router.use("/venues", venuesRouter);
router.use("/requests", requestsRouter);

export default router;
