import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { systemOwner } from "../src/lib/db/schema";
import { sampleProducts, seedSampleCatalog } from "../src/lib/sample-catalog";
import type { CatalogDb } from "../src/lib/product-store";

// Usage: npm run seed:samples  — adds sample caps and tech items (with images) as the system owner. Safe to re-run.
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const db = drizzle(pool, { schema }) as unknown as CatalogDb;
    const [owner] = await db.select({ id: systemOwner.userId }).from(systemOwner).limit(1);
    if (!owner) throw new Error("No system owner yet. Run npm run owner:bootstrap first.");
    const images: Record<string, string> = {};
    for (const s of sampleProducts) {
      const file = path.join(process.cwd(), "scripts", "sample-images", `${s.slug}.jpg`);
      if (existsSync(file)) images[s.slug] = `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
    }
    const created = await seedSampleCatalog(db, owner.id, images);
    console.log(created.length ? `Added ${created.length} sample products: ${created.join(", ")}. Caps and Tech sections are ON.` : "All sample products already exist. Caps and Tech sections are ON.");
  } finally { await pool.end(); }
}
main().catch(error => { console.error(`Sample seed failed: ${error instanceof Error ? error.message : "unknown error"}. No credentials logged.`); process.exitCode = 1; });
