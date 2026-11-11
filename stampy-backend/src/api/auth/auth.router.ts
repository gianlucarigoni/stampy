import { Router } from "express";
import emailRouter from "./email/email.router";
import googleRouter from "./google/google.router";
import accountRouter from "./account/account.router";
import { logout, me } from "./auth.controller";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";

const router = Router();

// Pubbliche: protette dai limiti nel DB, nessuna sessione richiesta.
router.use("/email", emailRouter);

// Login con Google (idToken verificato lato server): stesso limite IP delle rotte email.
router.use("/google", googleRouter);

// Eliminazione account (conferma OTP): le rotte montano da sole isAuthenticated.
router.use("/account", accountRouter);

// Protette: ordine rate limit -> isAuthenticated -> requireRole -> validate -> controller.
router.get("/me", isAuthenticated, me);
router.post("/logout", isAuthenticated, logout);

export default router;
