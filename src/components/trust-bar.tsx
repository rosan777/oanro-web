import Link from "@/components/locale-link";
import { formatPrice } from "@/lib/catalog";
import type { Locale } from "@/lib/locale-path";
import type { CheckoutRules } from "@/lib/order-store";
import { bnDigits, dayText } from "@/lib/public-rules";

// Rotating announcement bar above the header. Every number comes from the owner's admin rules.
export function TrustBar({ rules, locale, live, services }: { rules: CheckoutRules; locale: Locale; live: boolean; services: boolean }) {
  const bn = locale === "bn";
  const dhaka = dayText(rules.dhakaDays), outside = dayText(rules.outsideDays);
  const cod = rules.codLimit > 0;
  const messages = [
    bn ? `সারা বাংলাদেশে ডেলিভারি: ঢাকায় ${bnDigits(dhaka)} দিন, ঢাকার বাইরে ${bnDigits(outside)} দিন` : `Delivery across Bangladesh: ${dhaka} days in Dhaka, ${outside} days outside`,
    bn ? `বিকাশ, নগদ${cod ? ` ও ${formatPrice(rules.codLimit, locale)} পর্যন্ত ক্যাশ অন ডেলিভারি` : ""}` : `bKash, Nagad${cod ? ` and cash on delivery up to ${formatPrice(rules.codLimit, locale)}` : ""}`,
    services ? (bn ? "ওয়েবসাইট বা অ্যাপ লাগবে? ফ্রি কোট নিন" : "Need a website or app? Get a free quote") : (bn ? "ডেলিভারি ও রিটার্নের সব তথ্য" : "Full delivery & returns details"),
    ...(live ? [] : [bn ? "ডিজাইন প্রিভিউ: অর্ডার শিগগিরই চালু হবে" : "Design preview: ordering opens soon"]),
  ];
  return <div className="trust-bar" role="region" aria-label={bn ? "ঘোষণা" : "Announcements"}><div className="container trust-bar-row">
    <div className="announce" style={{ ["--n" as string]: messages.length }}>
      <ul className="announce-track">{[...messages, messages[0]].map((m, i) => <li key={i} aria-hidden={i === messages.length ? true : undefined}>{m}</li>)}</ul>
    </div>
    <Link href={services ? "/#studio" : "/delivery-returns"} className="announce-link">{services ? (bn ? "স্টুডিও" : "Studio") : (bn ? "ডেলিভারি ও রিটার্ন" : "Delivery & returns")}</Link>
  </div></div>;
}
