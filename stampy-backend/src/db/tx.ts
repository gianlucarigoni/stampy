import { db } from "./index";

// Tipo della transazione Drizzle, ricavato da db così non va ridefinito in ogni service.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Un metodo di service che accetta DbOrTx può girare sia da solo sia dentro una transazione:
//   const conn = tx ?? db;
export type DbOrTx = typeof db | Tx;
