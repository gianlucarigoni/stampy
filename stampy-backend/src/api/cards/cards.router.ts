import { Router } from "express";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";
import { mine } from "./cards.controller";

const router = Router();

router.get("/mine", isAuthenticated, mine);

export default router;
