import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/access";
import { DEFAULT_RULES, getCheckoutRules, getPaymentNumbers } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { CheckoutForm } from "@/components/checkout-form";
import { fullAddress, getProfile } from "@/lib/profile-store";
import { listAddresses } from "@/lib/address-store";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Checkout for signed-in shoppers, prefilled from their saved profile. Falls back to safe defaults if the database is slow. */
export default async function CheckoutPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in?next=/checkout");
  const db = catalogDb();
  const [numbers, profile, rules, addresses] = await Promise.all([
    getPaymentNumbers(db).catch(() => ({ bkash: "", nagad: "" })),
    getProfile(db, session.user.id).catch(() => null),
    getCheckoutRules(db).catch(() => DEFAULT_RULES),
    listAddresses(db, session.user.id).catch(() => []),
  ]);
  return (
    <main id="main-content" className="checkout-page o-section">
      <CheckoutForm
        numbers={numbers}
        rules={rules}
        name={profile?.name || session.user.name}
        phone={profile?.phone ?? ""}
        address={profile ? fullAddress(profile) : ""}
        verified={session.user.emailVerified}
        savedAddresses={addresses}
      />
    </main>
  );
}
