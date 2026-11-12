import { Router } from "express";
import emailRouter from "./email/email.router";
import googleRouter from "./google/google.router";
import accountRouter from "./account/account.router";
import { logout, me, updateMe } from "./auth.controller";
import { displayNameDTO } from "./auth.dto";
import { isAuthenticated } from "../../utils/middlewares/session.middleware";
import { ipAuthRateLimit } from "../../utils/middlewares/ip-rate-limit.middleware";
import { validate } from "../../utils/middlewares/validation.middleware";

const router = Router();

// Pubbliche: protette dai limiti nel DB, nessuna sessione richiesta.
router.use("/email", emailRouter);

// Login con Google (idToken verificato lato server): stesso limite IP delle rotte email.
router.use("/google", googleRouter);

// Eliminazione account (conferma OTP): le rotte montano da sole isAuthenticated.
router.use("/account", accountRouter);

// Protette: ordine rate limit -> isAuthenticated -> requireRole -> validate -> controller.
router.get("/me", isAuthenticated, me);
router.patch("/me", ipAuthRateLimit, isAuthenticated, validate(displayNameDTO, "body"), updateMe);
router.post("/logout", isAuthenticated, logout);

export default router;
