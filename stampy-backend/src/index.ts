import { createServer } from "node:http";
import app from "./app";
import { env } from "./config/env";
import { pool } from "./db";

const server = createServer(app);

pool
  .query("SELECT 1")
  .then(() => {
    server.listen(env.PORT, () => {
      console.log(`server listening on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Connessione DB fallita: ", err);
    process.exit(1);
  });
