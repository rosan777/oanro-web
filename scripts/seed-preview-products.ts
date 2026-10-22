import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { product, systemOwner } from "../src/lib/db/schema";
import { parseProductInput } from "../src/lib/product-input";
import { createProduct, type CatalogDb } from "../src/lib/product-store";

// Adds only the preview items below. Safe to re-run; existing slugs are left untouched.
const previews = [
  {
    slug: "demo-winter-knit-beanie", collectionId: "seasonal", imageFile: "winter-knit-beanie.jpg",
    nameEn: "Demo Winter Knit Beanie", nameBn: "ডেমো উইন্টার নিট বিনি",
    categoryEn: "Winter accessories", categoryBn: "শীতের অ্যাকসেসরিজ",
    taglineEn: "A live mobile product-card preview.", taglineBn: "মোবাইল প্রোডাক্ট কার্ডের লাইভ প্রিভিউ।",
    descriptionEn: "Demo product for checking the mobile storefront. The photo, details and price are placeholders and will be confirmed before sale.",
    descriptionBn: "মোবাইল স্টোরফ্রন্ট পরীক্ষা করার ডেমো পণ্য। ছবি, বিবরণ ও দাম বিক্রয়ের আগে নিশ্চিত করা হবে।",
    price: 590, sizes: "One size", specsEn: "Availability: Live demo preview",
    stock: 10, displayOrder: 5,
  },
  {
    slug: "demo-classic-cap", collectionId: "caps", imageFile: "classic-baseball-cap.jpg",
    nameEn: "Demo Classic Cap", nameBn: "ডেমো ক্লাসিক ক্যাপ",
    categoryEn: "Baseball caps", categoryBn: "বেসবল ক্যাপ",
    taglineEn: "A preview of the Caps collection.", taglineBn: "ক্যাপ কালেকশনের একটি প্রিভিউ।",
    descriptionEn: "Design preview only. The photo, details and price are placeholders and will be confirmed before sale.",
    descriptionBn: "শুধু ডিজাইন প্রিভিউ। ছবি, বিবরণ ও দাম বিক্রয়ের আগে নিশ্চিত করা হবে।",
    price: 890, sizes: "Adjustable", specsEn: "Availability: Demo preview only", stock: 0, displayOrder: 10,
  },
  {
    slug: "demo-pearl-necklace", collectionId: "jewelry", imageFile: "pearl-drop-necklace.jpg",
    nameEn: "Demo Pearl Necklace", nameBn: "ডেমো পার্ল নেকলেস",
    categoryEn: "Necklaces & pendants", categoryBn: "নেকলেস ও লকেট",
    taglineEn: "A preview of the Jewelry collection.", taglineBn: "গহনার কালেকশনের একটি প্রিভিউ।",
    descriptionEn: "Design preview only. The photo, details and price are placeholders and will be confirmed before sale.",
    descriptionBn: "শুধু ডিজাইন প্রিভিউ। ছবি, বিবরণ ও দাম বিক্রয়ের আগে নিশ্চিত করা হবে।",
    price: 1490, sizes: "One size", specsEn: "Availability: Demo preview only", stock: 0, displayOrder: 10,
  },
] as const;

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    const db = drizzle(pool, { schema }) as unknown as CatalogDb;
    const [owner] = await db.select({ id: systemOwner.userId }).from(systemOwner).limit(1);
    if (!owner) throw new Error("No system owner configured");
    for (const preview of previews) {
      const [existing] = await db.select({ id: product.id }).from(product).where(eq(product.slug, preview.slug)).limit(1);
      if (existing) { console.log(`Already exists: ${preview.slug}`); continue; }
      const image = `data:image/jpeg;base64,${readFileSync(path.join(process.cwd(), "scripts", "sample-images", preview.imageFile)).toString("base64")}`;
      await createProduct(db, owner.id, parseProductInput({ ...preview, status: "published" }), image);
      console.log(`Added: ${preview.slug}`);
    }
  } finally { await pool.end(); }
}

main().catch(error => { console.error(`Preview seed failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
