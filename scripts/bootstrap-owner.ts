import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { bootstrapOwner } from "../src/lib/db/bootstrap-owner";
async function main() {
loadEnvConfig(process.cwd());
const userId = process.argv[2];
const reason = process.argv[3];
if (!process.env.DATABASE_URL || !userId || !reason?.trim()) throw new Error("Usage: npm run owner:bootstrap -- VERIFIED_USER_ID 'reason' (DATABASE_URL required)");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await bootstrapOwner(client, userId, reason);
  console.log("Owner initialized; audit event recorded.");
} finally { client.release(); await pool.end(); }
}
main().catch(() => { console.error("Owner bootstrap failed. Check verified user ID, existing owner, database access and schema. No credentials logged."); process.exitCode = 1; });
