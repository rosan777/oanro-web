import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

// Usage: npm run seed:jewelry-images — attaches the sample photos in scripts/sample-images to the
// jewelry demo products that don't have a photo yet. Safe to re-run; never overwrites a photo you uploaded.
const slugs = ["pearl-drop-necklace", "gold-jhumka-earrings", "minimal-stone-ring", "twisted-bangle-pair", "silver-charm-anklet", "crystal-nose-pin"];
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    let done = 0;
    for (const slug of slugs) {
      const file = path.join(process.cwd(), "scripts", "sample-images", `${slug}.jpg`);
      if (!existsSync(file)) continue;
      const image = `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
      const result = await pool.query("update product set image_data = $1, updated_at = now() where slug = $2 and image_data is null", [image, slug]);
      done += result.rowCount ?? 0;
    }
    console.log(`Added photos to ${done} jewelry product(s).`);
  } finally { await pool.end(); }
}
main().catch(error => { console.error(`Jewelry photo seed failed: ${error instanceof Error ? error.message : "unknown error"}. No credentials logged.`); process.exitCode = 1; });
