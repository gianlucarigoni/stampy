import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import apiRouter from "./api/routes";
import { errorHandlers } from "./errors";

const app = express();

app.disable("x-powered-by")
app.use(cors());
app.use(morgan("tiny"));

// Senza segreto (decisione approvata): cookie non firmati, req.signedCookies non usato.
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api", apiRouter);

app.use(errorHandlers);

export default app;
