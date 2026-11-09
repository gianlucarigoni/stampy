import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import apiRouter from "./api/routes";
import { env } from "./config/env";
import { ALLOWED_ORIGIN, requireSameOrigin } from "./utils/middlewares/origin.middleware";
import { errorHandlers } from "./errors";
import { RouteNotFoundError } from "./errors/route-not-found.error";

const app = express();

app.disable("x-powered-by");

// Dietro un proxy (Cloudflare, hosting) serve per avere req.ip reale: il limiter IP
// usa req.ip come chiave. Numero di hop, non `true` (falsificabile).
if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
// Una sola origin (APP_ORIGIN) con credentials, mai '*'. Origin estranea: nessun header CORS.
app.use(cors({ origin: (origin, cb) => cb(null, origin === ALLOWED_ORIGIN), credentials: true }));
if (env.NODE_ENV !== "test") app.use(morgan("tiny")); // nei test (Vitest: NODE_ENV=test) niente rumore

// Senza segreto (decisione approvata): cookie non firmati, req.signedCookies non usato.
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api", requireSameOrigin, apiRouter);
// Solo /api: il resto resterà libero per il frontend (stessa origine, fallback SPA).
app.use("/api", (_req, _res, next) => next(new RouteNotFoundError()));

app.use(errorHandlers);

export default app;
