import Link from "@/components/locale-link";
import type { Locale } from "@/lib/locale-path";
import type { CheckoutRules } from "@/lib/order-store";
import { bnDigits, dayText } from "@/lib/public-rules";

// Thin bar above the header: delivery times and payment options, straight from the admin rules.
export function TrustBar({ rules, locale }: { rules: CheckoutRules; locale: Locale }) {
  const bn = locale === "bn";
  const dhaka = dayText(rules.dhakaDays), outside = dayText(rules.outsideDays);
  const cod = rules.codLimit > 0;
  return <div className="trust-bar"><div className="container trust-bar-row">
    <span>{bn ? `সারা বাংলাদেশে ডেলিভারি: ঢাকায় ${bnDigits(dhaka)} দিন, ঢাকার বাইরে ${bnDigits(outside)} দিন` : `Delivery across Bangladesh: ${dhaka} days in Dhaka, ${outside} days outside`}</span>
    <span>{bn ? `বিকাশ, নগদ${cod ? " ও ক্যাশ অন ডেলিভারি" : ""}` : `bKash, Nagad${cod ? " and cash on delivery" : ""}`}</span>
    <Link href="/delivery-returns">{bn ? "ডেলিভারি ও রিটার্ন" : "Delivery & returns"}</Link>
  </div></div>;
}
