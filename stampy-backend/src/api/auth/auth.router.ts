import { Router } from "express";
import emailRouter from "./email/email.router"
const router = Router();

router.use("/email", emailRouter);

export default router;
