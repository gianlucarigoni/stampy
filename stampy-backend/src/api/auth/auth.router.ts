import { Router } from "express";
import emailRouter from "./email/email.router";
import { logout, me } from "./auth.controller";
import { isAuthenticated } from "./session.middleware";

const router = Router();

// Pubbliche: protette dai limiti nel DB, nessuna sessione richiesta.
router.use("/email", emailRouter);

// Protette: ordine rate limit -> isAuthenticated -> requireRole -> validate -> controller.
router.get("/me", isAuthenticated, me);
router.post("/logout", isAuthenticated, logout);

export default router;
