import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import apiRouter from "./api/routes";

const app = express();

app.use(cors());
app.use(morgan("tiny"));

app.use(bodyParser.json());

app.use("/api", apiRouter);

export default app;
