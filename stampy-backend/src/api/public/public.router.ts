import { Router } from "express";
import { ipPublicRateLimit } from "../../utils/middlewares/ip-rate-limit.middleware";
import { venueName } from "./public.controller";

const router = Router();

// ATTENZIONE: rotte NON autenticate. Solo dati che la pagina di login può mostrare a chiunque.
// Ordine: rate limit per IP -> controller (il formato dell'UUID si controlla nel controller, vedi lì).
router.get("/venues/:venueId", ipPublicRateLimit, venueName);

export default router;
