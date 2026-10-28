import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { rateLimit } from "./db/schema";
import type { CatalogDb } from "./product-store";
import { appSecret } from "./app-secret";

/** The visitor's IP as Vercel reports it (first entry of x-forwarded-for). */
export function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
}

/**
 * Counts attempts per visitor in a fixed time window, in the same table sign-in limits use
 * (keys start with "oanro:" so they never mix with the sign-in ones). The IP is stored only as a salted hash.
 * Returns true while the visitor is under the limit. If the database can't be reached it allows the request,
 * because the endpoint itself will fail anyway and a limiter must never block honest shoppers by mistake.
 */
export async function underLimit(db: CatalogDb, request: Request, name: string, max: number, windowMs: number) {
  const ip = clientIp(request);
  if (!ip) return true;
  const hash = createHash("sha256").update(`${appSecret("oanro")}:oanro-limit:${ip}`).digest("hex").slice(0, 32);
  const now = Date.now(), windowStart = now - windowMs;
  try {
    const [row] = await db.insert(rateLimit).values({ id: randomUUID(), key: `oanro:${name}:${hash}`, count: 1, lastRequest: now })
      .onConflictDoUpdate({ target: rateLimit.key, set: {
        count: sql`case when ${rateLimit.lastRequest} < ${windowStart} then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: sql`case when ${rateLimit.lastRequest} < ${windowStart} then ${now} else ${rateLimit.lastRequest} end`,
      } }).returning({ count: rateLimit.count });
    return (row?.count ?? 1) <= max;
  } catch { return true; }
}
