import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import { pool } from "./db";

const server = createServer(app);

pool
  .query("SELECT 1")
  .then(() => {
    server.listen(3000, () => {
      console.log(`server listening on port 3000`);
    });
  })
  .catch((err) => {
    console.error("Connessione DB fallita: ", err);
    process.exit(1);
  });
