import { requireAdminPage } from "@/lib/admin-guard";
import { listDiscounts } from "@/lib/discount-store";
import { catalogDb } from "@/lib/store-products";
import { DiscountManager } from "@/components/discount-manager";
export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  await requireAdminPage("discounts.manage");
  const rows = await listDiscounts(catalogDb());
  return <main id="main-content" className="container auth-page"><h1>Discount codes</h1>
    <p className="small-note">Codes customers type at checkout. Discounts apply to products only (not the delivery charge). Each order can use one code.</p>
    <DiscountManager initial={rows.map(r => ({ ...r, startsAt: r.startsAt?.toISOString() ?? null, endsAt: r.endsAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))} />
  </main>;
}
