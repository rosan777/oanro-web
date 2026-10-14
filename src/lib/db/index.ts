import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const shared = globalThis as typeof globalThis & { oanroPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const pool = shared.oanroPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
  return drizzle(pool, { schema });
}
