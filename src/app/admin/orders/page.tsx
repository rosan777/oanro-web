import { requireAdminPage } from "@/lib/admin-guard";
import { getCheckoutRules, getPaymentNumbers, listOrders } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { OrdersDashboard } from "@/components/orders-dashboard";
export const dynamic = "force-dynamic";
export default async function OrdersAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; open?: string }> }) {
  const { access } = await requireAdminPage("orders.read");
  const sp = await searchParams;
  const db = catalogDb();
  const cod = access.permissions.has("cod.manage");
  const [orders, numbers, rules] = await Promise.all([listOrders(db, { includeCod: cod }), getPaymentNumbers(db), getCheckoutRules(db)]);
  return <main id="main-content" className="container auth-page admin-orders"><h1>Orders &amp; payments</h1>
    <p>Click an order to open it. Check each payment in your bKash or Nagad app first. Approve only when the money and Transaction ID match.</p>
    <OrdersDashboard initial={orders} numbers={numbers} rules={rules} canReview={access.permissions.has("orders.manage")} canCod={cod} isOwner={access.owner} openId={sp.open?.slice(0, 80)} query={(sp.q ?? "").trim().slice(0, 60)} />
  </main>;
}
