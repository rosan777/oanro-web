import "server-only";
import { setDefaultAutoSelectFamily } from "node:net";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Node's "Happy Eyeballs" tries IPv4 and IPv6 at once; on networks where IPv6 to the
// database host is unreachable, that race intermittently fails the whole connection.
// Turning it off makes every connection attempt go straight to IPv4.
setDefaultAutoSelectFamily(false);

// The pg driver already treats sslmode=prefer/require/verify-ca as verify-full and warns about it.
// Saying verify-full explicitly keeps exactly the same (strict) security and silences the warning.
export function databaseUrl(raw = process.env.DATABASE_URL ?? "") {
  return raw.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/, "$1verify-full");
}

const shared = globalThis as typeof globalThis & { oanroPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const pool = shared.oanroPool ??= new Pool({ connectionString: databaseUrl(), max: 10, connectionTimeoutMillis: 30000,
    // Keep warm connections for 4 minutes: opening a new TLS connection to the database costs several round trips.
    idleTimeoutMillis: 240_000, keepAlive: true });
  return drizzle(pool, { schema });
}
