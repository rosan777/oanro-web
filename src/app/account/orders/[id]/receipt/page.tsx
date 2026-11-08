import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/lib/access";
import { getAccess } from "@/lib/rbac";
import { receiptOrder } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { requestLocale } from "@/lib/request-locale";
import { formatPrice } from "@/lib/catalog";
import { formatDhaka } from "@/lib/dhaka-time";
import { getSiteContent } from "@/lib/site-content";
import { PrintButton } from "@/components/print-button";
import Link from "@/components/locale-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Order receipt",
  robots: { index: false, follow: false },
};

/**
 * Printable receipt for one order, built from the order itself (no separate invoice record).
 * It is an order receipt, not a tax invoice: no tax, VAT or registration details are shown.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await currentSession();
  if (!session) redirect(`/sign-in?next=/account/orders/${id}/receipt`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = catalogDb();
  const access = await getAccess(db, session.user.id);
  const order = await receiptOrder(db, id, {
    userId: session.user.id,
    staff: access.permissions.has("orders.read"),
    includeCod: access.permissions.has("cod.manage"),
  });
  if (!order) notFound();
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const { contact } = await getSiteContent();
  const subtotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const cod = order.paymentType === "cod";
  const payable = cod ? (order.codDue ?? 0) : order.total - (order.deliveryCharge ?? 0);
  const discount = Math.max(0, subtotal - payable);
  const method = order.method === "bkash" ? "bKash" : "Nagad";
  const status =
    order.status === "paid"
      ? t("Payment confirmed", "পেমেন্ট নিশ্চিত")
      : order.status === "rejected"
        ? t("Payment not confirmed", "পেমেন্ট নিশ্চিত হয়নি")
        : t("Payment being checked", "পেমেন্ট যাচাই চলছে");
  return (
    <main id="main-content" className="o-section o-receipt-page">
      <div className="o-receipt-tools">
        <Link href="/account?tab=invoices">← {t("Back to receipts", "রসিদে ফিরে যান")}</Link>
        <PrintButton label={t("Print or save as PDF", "প্রিন্ট বা PDF সেভ করুন")} />
      </div>
      <article className="o-receipt">
        <header>
          <div>
            <b className="o-receipt-brand">OANRO</b>
            <small>{[contact.email, "oanro.com"].filter(Boolean).join(" · ")}</small>
          </div>
          <div>
            <h1>{t("Order receipt", "অর্ডারের রসিদ")}</h1>
            <small>{order.code}</small>
          </div>
        </header>
        <dl className="o-receipt-meta">
          <div>
            <dt>{t("Date", "তারিখ")}</dt>
            <dd>{formatDhaka(order.createdAt, locale, { year: true, time: true })}</dd>
          </div>
          <div>
            <dt>{t("Customer", "গ্রাহক")}</dt>
            <dd>
              {order.customerName}
              <br />
              {order.phone}
            </dd>
          </div>
          <div>
            <dt>{t("Deliver to", "ডেলিভারি ঠিকানা")}</dt>
            <dd>{order.address}</dd>
          </div>
          <div>
            <dt>{t("Status", "অবস্থা")}</dt>
            <dd>{status}</dd>
          </div>
        </dl>
        <table>
          <thead>
            <tr>
              <th scope="col">{t("Item", "পণ্য")}</th>
              <th scope="col">{t("Qty", "পরিমাণ")}</th>
              <th scope="col">{t("Price", "দাম")}</th>
              <th scope="col">{t("Amount", "মোট")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(i => (
              <tr key={`${i.slug}-${i.size}-${i.color}`}>
                <td>
                  {i.name}
                  <small>{[i.color, i.size].filter(Boolean).join(" / ")}</small>
                </td>
                <td>{i.quantity}</td>
                <td>{formatPrice(i.unitPrice, locale)}</td>
                <td>{formatPrice(i.unitPrice * i.quantity, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="o-receipt-totals">
          <div>
            <dt>{t("Items", "পণ্যের দাম")}</dt>
            <dd>{formatPrice(subtotal, locale)}</dd>
          </div>
          {discount > 0 && (
            <div>
              <dt>{t("Discount", "ছাড়")}</dt>
              <dd>−{formatPrice(discount, locale)}</dd>
            </div>
          )}
          <div>
            <dt>{t("Delivery charge", "ডেলিভারি চার্জ")}</dt>
            <dd>{formatPrice(order.deliveryCharge ?? 0, locale)}</dd>
          </div>
          <div className="is-total">
            <dt>{t("Order total", "অর্ডারের মোট")}</dt>
            <dd>{formatPrice(payable + (order.deliveryCharge ?? 0), locale)}</dd>
          </div>
          <div>
            <dt>{t(`Paid by ${method}`, `${method}-এ পরিশোধ`)}</dt>
            <dd>
              {formatPrice(order.total, locale)} · TrxID {order.trxId}
            </dd>
          </div>
          {cod && (
            <div>
              <dt>{t("Cash on delivery", "ক্যাশ অন ডেলিভারি")}</dt>
              <dd>{formatPrice(order.codDue ?? 0, locale)}</dd>
            </div>
          )}
        </dl>
        <p className="o-receipt-note">
          {t(
            "This is an order receipt for your records. It is not a tax invoice.",
            "এটি আপনার রেকর্ডের জন্য একটি অর্ডারের রসিদ। এটি ট্যাক্স ইনভয়েস নয়।",
          )}
        </p>
      </article>
    </main>
  );
}
