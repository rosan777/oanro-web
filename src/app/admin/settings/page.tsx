import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { getCheckoutRules, getPaymentNumbers } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { OrdersDashboard } from "@/components/orders-dashboard";
export const dynamic = "force-dynamic";
/** Owner-only: bKash/Nagad numbers, test email and delivery & payment rules (moved here from the Orders page). */
export default async function SettingsPage() {
  const { access } = await requireAdminPage();
  if (!access.owner) notFound();
  const db = catalogDb();
  const [numbers, rules] = await Promise.all([getPaymentNumbers(db), getCheckoutRules(db)]);
  return <main id="main-content" className="container auth-page admin-orders"><h1>Payment &amp; delivery</h1>
    <p>Your bKash and Nagad numbers, delivery charge, cash on delivery limit and return window. Only you (the owner) can see this page.</p>
    <OrdersDashboard mode="settings" initial={[]} numbers={numbers} rules={rules} canReview={false} canCod={false} isOwner />
  </main>;
}
