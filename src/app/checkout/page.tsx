import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/access";
import { DEFAULT_RULES, getCheckoutRules, getPaymentNumbers } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { CheckoutForm } from "@/components/checkout-form";
import { fullAddress, getProfile } from "@/lib/profile-store";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function CheckoutPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in?next=/checkout");
  const db = catalogDb();
  const [numbers, profile, rules] = await Promise.all([getPaymentNumbers(db).catch(() => ({ bkash: "", nagad: "" })), getProfile(db, session.user.id).catch(() => null), getCheckoutRules(db).catch(() => DEFAULT_RULES)]);
  return <main id="main-content" className="container checkout-page">
    <CheckoutForm numbers={numbers} rules={rules} name={profile?.name || session.user.name} phone={profile?.phone ?? ""} address={profile ? fullAddress(profile) : ""} verified={session.user.emailVerified} />
  </main>;
}
