// Order-tracking abuse limits shared by every public tracking entry point (the Track page API and the assistant form).
import { createHash } from "node:crypto";
import { consume } from "./store";
import type { CatalogDb } from "../product-store";

export type TrackGate = { ok: true } | { ok: false; retryAfter: number };
/**
 * Three persistent, atomic counters: per visitor (guessing across many codes), per order code (many visitors against one code)
 * and global (distributed enumeration). Throws if the shared counter is unreachable so callers refuse the lookup (fail closed).
 */
export async function trackGate(db: CatalogDb, visitor: string, rawCode: string): Promise<TrackGate> {
  const code = createHash("sha256").update(rawCode.trim().toUpperCase()).digest("hex").slice(0, 24);
  for (const [key, max, window] of [[`track:v:${visitor}`, 15, 600_000], [`track:c:${code}`, 8, 600_000], ["track:all", 400, 600_000]] as const) {
    const r = await consume(db, key, max, window);
    if (!r.ok) return { ok: false, retryAfter: r.retryAfter };
  }
  return { ok: true };
}
