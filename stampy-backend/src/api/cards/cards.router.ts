import { Router } from "express";
import googleRouter  from "./google/google.router"

const router = Router();

// google weallet
router.use("/google", googleRouter)

export default router;
