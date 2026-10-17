import { requireAdminPage } from "@/lib/admin-guard";
import { getCheckoutRules, getPaymentNumbers, listOrders } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { AdminBack } from "@/components/admin-nav";
import { OrdersDashboard } from "@/components/orders-dashboard";
export const dynamic = "force-dynamic";
export default async function OrdersAdminPage() {
  const { access } = await requireAdminPage("orders.read");
  const db = catalogDb();
  const cod = access.permissions.has("cod.manage");
  const [orders, numbers, rules] = await Promise.all([listOrders(db, { includeCod: cod }), getPaymentNumbers(db), getCheckoutRules(db)]);
  return <main id="main-content" className="container auth-page admin-orders"><AdminBack /><h1>Orders &amp; payments</h1>
    <p>Check each payment in your bKash or Nagad app first. Approve only when the money and Transaction ID match.</p>
    <OrdersDashboard initial={orders} numbers={numbers} rules={rules} canReview={access.permissions.has("orders.manage")} canCod={cod} isOwner={access.owner} />
  </main>;
}
