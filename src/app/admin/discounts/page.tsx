import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { listDiscounts } from "@/lib/discount-store";
import { asc, isNull } from "drizzle-orm";
import { catalogDb } from "@/lib/store-products";
import { product, productCollection } from "@/lib/db/schema";
import { DiscountManager } from "@/components/discount-manager";
export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  await requireAdminPage("discounts.manage");
  const db = catalogDb();

  // Codes, plus the sections and products a code can be limited to.

  const [rows, sections, items] = await Promise.all([
    listDiscounts(db),
    db
      .select({ id: productCollection.id, name: productCollection.nameEn })
      .from(productCollection)
      .where(isNull(productCollection.archivedAt))
      .orderBy(asc(productCollection.displayOrder)),
    db
      .select({
        slug: product.slug,
        name: product.nameEn,
        collectionId: product.collectionId,
        status: product.status,
      })
      .from(product)
      .where(isNull(product.archivedAt))
      .orderBy(asc(product.nameEn)),
  ]);
  return (
    <main id="main-content" className="container auth-page">
      <h1>
        <Localized en="Discount codes" bn="ডিসকাউন্ট কোড" />
      </h1>
      <p className="small-note">
        <Localized
          en="Codes customers type at checkout. Discounts apply to products only (not the delivery charge). Each order can use one code. A code can cover everything, or only chosen sections or products."
          bn="চেকআউটে গ্রাহকরা যে কোড লেখেন। ছাড় শুধু পণ্যে (ডেলিভারি চার্জে নয়)। প্রতি অর্ডারে একটি কোড। একটি কোড সবকিছুতে, অথবা শুধু বাছাই করা সেকশন বা পণ্যে চলতে পারে।"
        />
      </p>
      <DiscountManager
        sections={sections}
        products={items}
        initial={rows.map(r => ({
          ...r,
          startsAt: r.startsAt?.toISOString() ?? null,
          endsAt: r.endsAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
