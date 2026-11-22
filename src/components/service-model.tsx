import Link from "./locale-link";

export default function ServiceModel({ slug, bn, compact = false }: { slug: string; bn: boolean; compact?: boolean }) {
  const file = slug === "web" ? "instrument/booking.html" :
    ["systems", "app", "strategy"].includes(slug) ? `instrument/service.html?model=${slug}` : null;
  if (!file) return null;
  return <div className="service-model">
    <iframe loading="lazy" src={`/studies/${file}${file.includes("?") ? "&" : "?"}lang=${bn ? "bn" : "en"}${compact ? "&compact=1" : ""}`} title={`${bn ? "ইন্টার‌্যাকটিভ মডেল" : "Interactive model"} — ${slug}`} />
    <Link href={`/services/${slug}`}>{bn ? "সেবার বিস্তারিত ও যোগাযোগ" : "Service details and enquiry"} →</Link>
  </div>;
}
