import { Router } from "express";
import { healt } from "./healt/healt.controller";

const router = Router();

router.get("/healt", healt);

export default router;
