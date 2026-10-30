import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import apiRouter from "./api/routes";
import { env } from "./config/env";
import { errorHandlers } from "./errors";
import { RouteNotFoundError } from "./errors/route-not-found.error";

const app = express();

app.disable("x-powered-by")

// Dietro un proxy (Cloudflare, hosting) serve per avere req.ip reale: il limiter IP
// usa req.ip come chiave. Numero di hop, non `true` (falsificabile).
if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
app.use(cors());
app.use(morgan("tiny"));

// Senza segreto (decisione approvata): cookie non firmati, req.signedCookies non usato.
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api", apiRouter);
// Solo /api: il resto resterà libero per il frontend (stessa origine, fallback SPA).
app.use("/api", (_req, _res, next) => next(new RouteNotFoundError()));

app.use(errorHandlers);

export default app;
