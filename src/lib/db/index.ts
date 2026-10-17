import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const shared = globalThis as typeof globalThis & { oanroPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const pool = shared.oanroPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000,
    // Keep warm connections for 4 minutes: opening a new TLS connection to the database costs several round trips.
    idleTimeoutMillis: 240_000, keepAlive: true });
  return drizzle(pool, { schema });
}
