import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });

export const db = drizzle(pool, { schema, logger: true });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
