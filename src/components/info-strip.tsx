// The yellow information strip on the homepage (approved marquee preview): a calm, endlessly looping
// row of store and company-profile service areas with small • separators. It pauses on hover or
// keyboard focus and stands still (wrapped) with reduced motion or the site's "Pause motion" switch.
// Payment methods are deliberately not in the strip: they have their own row (PaymentRow) with their
// brand colours.

import {
  BarChart3,
  Cloud,
  Code2,
  Globe2,
  MessageCircle,
  Monitor,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";

type Item = { icon: LucideIcon; en: string; bn: string };

export function InfoStrip({
  bn,
  products,
  services,
}: {
  bn: boolean;
  products: boolean;
  services: boolean;
}) {
  const items: Item[] = [
    ...(products
      ? [{ icon: Truck, en: "Delivery across Bangladesh", bn: "সারা বাংলাদেশে ডেলিভারি" }]
      : []),
    ...(services
      ? [
          {
            icon: Code2,
            en: "Custom software, AI & intelligent agents",
            bn: "কাস্টম সফটওয়্যার, AI ও ইন্টেলিজেন্ট এজেন্ট",
          },
        ]
      : []),
    { icon: MessageCircle, en: "A real person replies", bn: "উত্তর দেন একজন মানুষ" },
    ...(services
      ? [
          {
            icon: Monitor,
            en: "Web, mobile, desktop & SaaS platforms",
            bn: "ওয়েব, মোবাইল, ডেস্কটপ ও SaaS প্ল্যাটফর্ম",
          },
          {
            icon: ShoppingCart,
            en: "E-commerce, ERP/CRM & business automation",
            bn: "ই-কমার্স, ERP/CRM ও বিজনেস অটোমেশন",
          },
          {
            icon: Cloud,
            en: "Cloud, DevOps, security & managed IT",
            bn: "ক্লাউড, DevOps, নিরাপত্তা ও ম্যানেজড IT",
          },
          {
            icon: BarChart3,
            en: "Data analytics, APIs & systems integration",
            bn: "ডেটা অ্যানালিটিক্স, API ও সিস্টেম ইন্টিগ্রেশন",
          },
          {
            icon: ShieldCheck,
            en: "IoT, QA, monitoring & disaster recovery",
            bn: "IoT, QA, মনিটরিং ও ডিজাস্টার রিকভারি",
          },
          {
            icon: Globe2,
            en: "Worldwide, remote-first business support",
            bn: "বিশ্বজুড়ে, রিমোট-ফার্স্ট বিজনেস সাপোর্ট",
          },
        ]
      : []),
    ...(products
      ? [
          {
            icon: Package,
            en: "Selected products & delivery across Bangladesh",
            bn: "বাছাই করা পণ্য ও সারা বাংলাদেশে ডেলিভারি",
          },
        ]
      : []),
  ];
  const group = (hidden: boolean) => (
    <ul className="o-ticker-group" aria-hidden={hidden || undefined}>
      {items.map(({ icon: Icon, en, bn: b }) => (
        <li key={en} className="o-ticker-item">
          <Icon size={17} strokeWidth={1.65} aria-hidden="true" />
          {bn ? b : en}
        </li>
      ))}
    </ul>
  );
  return (
    // tabIndex lets keyboard users focus the strip to pause it, like hovering does.
    <div
      className="o-ticker"
      role="region"
      aria-label={bn ? "OANRO স্টোর ও সেবার তথ্য" : "OANRO store and service information"}
      tabIndex={0}
    >
      <div className="o-ticker-track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

/** Payment methods in their own row, with their brand colours (cash on delivery only when it is on). */
export function PaymentRow({ bn, cod }: { bn: boolean; cod: boolean }) {
  return (
    <div className="o-pay-row">
      <span className="o-pay-lead">{bn ? "আপনার মতো করে পরিশোধ করুন" : "Pay your way"}</span>
      <span className="o-pay-chip is-bkash">{bn ? "বিকাশ" : "bKash"}</span>
      <span className="o-pay-chip is-nagad">{bn ? "নগদ" : "Nagad"}</span>
      {cod && (
        <span className="o-pay-chip is-cod">{bn ? "ক্যাশ অন ডেলিভারি" : "Cash on delivery"}</span>
      )}
    </div>
  );
}
