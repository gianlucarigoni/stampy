import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";

const server = createServer(app);
const dbUrl = process.env.DATABASE_URL;
server.listen(3000, () => {
  console.log(`server listening on port 3000`);
});
