import type { ReactNode } from "react";
import Link from "@/components/locale-link";
import { AnnounceToast } from "@/components/announce-toast";
import { formatPrice } from "@/lib/catalog";
import type { Locale } from "@/lib/locale-path";
import type { CheckoutRules } from "@/lib/order-store";
import { bnDigits, dayText } from "@/lib/text-format";

// Rotating announcement bar above the header. Every number comes from the owner's admin rules.
/** custom: owner messages from Admin → Announcement bar; when there are any, they replace the automatic ones. */
export function TrustBar({ rules, locale, live, services, custom = [] }: { rules: CheckoutRules; locale: Locale; live: boolean; services: boolean; custom?: { text: string; link: string }[] }) {
  const bn = locale === "bn";
  const dhaka = dayText(rules.dhakaDays), outside = dayText(rules.outsideDays);
  const cod = rules.codLimit > 0;
  const auto = [
    bn ? `সারা বাংলাদেশে ডেলিভারি: ঢাকায় ${bnDigits(dhaka)} দিন, ঢাকার বাইরে ${bnDigits(outside)} দিন` : `Delivery across Bangladesh: ${dhaka} days in Dhaka, ${outside} days outside`,
    bn ? `বিকাশ, নগদ${cod ? ` ও ${formatPrice(rules.codLimit, locale)} পর্যন্ত ক্যাশ অন ডেলিভারি` : ""}` : `bKash, Nagad${cod ? ` and cash on delivery up to ${formatPrice(rules.codLimit, locale)}` : ""}`,
    services ? (bn ? "ওয়েবসাইট বা অ্যাপ লাগবে? ফ্রি কোট নিন" : "Need a website or app? Get a free quote") : (bn ? "ডেলিভারি ও রিটার্নের সব তথ্য" : "Full delivery & returns details"),
    ...(live ? [] : [bn ? "ডিজাইন প্রিভিউ: অর্ডার শিগগিরই চালু হবে" : "Design preview: ordering opens soon"]),
  ];
  const messages: ReactNode[] = custom.length ? custom.map(c => c.link ? <Link key={c.text} href={c.link}>{c.text}</Link> : c.text) : auto;
  const track = (key: string) => <div className="announce" style={{ ["--n" as string]: messages.length }}>
    <ul className="announce-track">{[...messages, messages[0]].map((m, i) => <li key={`${key}${i}`} aria-hidden={i === messages.length ? true : undefined}>{m}</li>)}</ul>
  </div>;
  return <><div className="trust-bar" role="region" aria-label={bn ? "ঘোষণা" : "Announcements"}><div className="container trust-bar-row">
    {track("d")}
    <Link href={services ? "/#studio" : "/delivery-returns"} className="announce-link">{services ? (bn ? "স্টুডিও" : "Studio") : (bn ? "ডেলিভারি ও রিটার্ন" : "Delivery & returns")}</Link>
  </div></div>
  <AnnounceToast closeLabel={bn ? "ঘোষণা বন্ধ করুন" : "Close announcement"}>{track("m")}</AnnounceToast></>;
}
