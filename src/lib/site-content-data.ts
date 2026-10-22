// What the owner can edit in Admin → Website content: texts (English + Bangla), homepage/page sections on/off,
// Guides, Studio packages and the service FAQ. Pure data (no server imports) so pages, the browser and tests share it.
import { guides as defaultGuides, serviceFaq as defaultFaq, studioPackages as defaultPackages, type Bi, type Guide } from "./content";

export type TextKey = keyof typeof textFields;
export const textFields = {
  "hero.eyebrow": { group: "Homepage — hero", label: "Small line above the headline", en: "What you wear · What you build · Wherever you are", bn: "যা পরবেন · যা গড়বেন · যেখানেই থাকুন" },
  "hero.headline": { group: "Homepage — hero", label: "Main headline", en: "Built for what's next", bn: "আগামীর জন্য তৈরি" },
  "hero.lede": { group: "Homepage — hero", label: "Paragraph under the headline", long: true, en: "Shop winter clothing, caps, tech and jewelry with cash on delivery — or hire OANRO Studio for software, website and app development.", bn: "শীতের পোশাক, ক্যাপ, টেক ও জুয়েলারি কিনুন ক্যাশ অন ডেলিভারিতে — অথবা সফটওয়্যার, ওয়েবসাইট ও অ্যাপ বানাতে OANRO স্টুডিওকে বলুন।" },
  "hero.ctaShop": { group: "Homepage — hero", label: "Shop button", en: "Shop the collection", bn: "কালেকশন দেখুন" },
  "hero.ctaQuote": { group: "Homepage — hero", label: "Quote button", en: "Get a free quote", bn: "ফ্রি কোট নিন" },
  "about.eyebrow": { group: "Homepage — who we are", label: "Small label", en: "Who we are", bn: "আমরা কারা" },
  "about.title": { group: "Homepage — who we are", label: "Heading", en: "We are OANRO.", bn: "আমরা OANRO।" },
  "about.body": { group: "Homepage — who we are", label: "Paragraph", long: true, en: "Built for what's next. Every product we offer is chosen with intent, and every website, app and system we build is held to one standard — fast, honest and made to last. When our name is on it, it has to be right.", bn: "আগামীর জন্য তৈরি। আমাদের প্রতিটি পণ্য উদ্দেশ্য নিয়ে বাছাই করা, আর প্রতিটি ওয়েবসাইট, অ্যাপ ও সিস্টেম একটিই মানে তৈরি — দ্রুত, সৎ ও টেকসই। যেখানে আমাদের নাম থাকে, সেখানে কাজটা ঠিক হতেই হবে।" },
  "bento.title": { group: "Homepage — why OANRO", label: "Heading", en: "Made simple, from order to doorstep.", bn: "অর্ডার থেকে দরজা পর্যন্ত — সহজ।" },
  "studio.eyebrow": { group: "Homepage — studio", label: "Small label", en: "OANRO Studio · Software, web, app & IT solutions", bn: "OANRO স্টুডিও · সফটওয়্যার, ওয়েব, অ্যাপ ও আইটি সলিউশন" },
  "studio.headline": { group: "Homepage — studio", label: "Heading (use | for a new line)", en: "We build it.|You run your business.", bn: "আমরা বানাই।|আপনি ব্যবসা চালান।" },
  "studio.lede": { group: "Homepage — studio", label: "Paragraph", long: true, en: "Software, websites, apps and IT solutions for businesses anywhere — a fixed quote, a live preview, launched on your own domain.", bn: "যেকোনো জায়গার ব্যবসার জন্য সফটওয়্যার, ওয়েবসাইট, অ্যাপ ও আইটি সলিউশন — নির্দিষ্ট দাম, লাইভ প্রিভিউ, আপনার নিজের ডোমেইনে লঞ্চ।" },
  "contact.title": { group: "Homepage — contact", label: "Heading", en: "Let's start a conversation", bn: "চলুন কথা শুরু করি" },
  "contact.body": { group: "Homepage — contact", label: "Paragraph", en: "A question about a product, a service or a project? A real person from our team replies.", bn: "পণ্য, সেবা বা প্রজেক্ট নিয়ে প্রশ্ন? আমাদের টিমের একজন মানুষ উত্তর দেবেন।" },
  "footer.tagline": { group: "Footer", label: "Brand line", en: "Thoughtfully chosen products and dependable technology, made for the way you live and work.", bn: "যত্নে বাছাই করা পণ্য আর নির্ভরযোগ্য প্রযুক্তি — আপনার জীবন ও কাজের জন্য তৈরি।" },
  "aboutPage.headline": { group: "About page", label: "Headline", en: "Built for what's next.", bn: "আগামীর জন্য তৈরি।" },
  "aboutPage.lede": { group: "About page", label: "Intro paragraph", long: true, en: "OANRO is two things under one name: a store of thoughtfully chosen products, and a studio that builds software, websites and apps. Both run on the same promise — when our name is on it, it has to be right.", bn: "OANRO এক নামে দুটি কাজ: যত্নে বাছাই করা পণ্যের একটি স্টোর, আর সফটওয়্যার, ওয়েবসাইট ও অ্যাপ বানানোর একটি স্টুডিও। দুটোই একই প্রতিশ্রুতিতে চলে — যেখানে আমাদের নাম থাকে, সেখানে কাজটা ঠিক হতেই হবে।" },
  "aboutPage.store": { group: "About page", label: "The store", long: true, en: "Winter clothing, caps, tech and jewelry — picked one by one, described honestly, delivered across Bangladesh with cash on delivery, bKash or Nagad. If something arrives wrong or damaged, we fix it.", bn: "শীতের পোশাক, ক্যাপ, টেক আর জুয়েলারি — একটি একটি করে বাছাই, সৎভাবে বর্ণনা, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি, বিকাশ বা নগদে ডেলিভারি। ভুল বা ক্ষতিগ্রস্ত পণ্য এলে আমরা ঠিক করে দিই।" },
  "aboutPage.studio": { group: "About page", label: "The studio", long: true, en: "Software, websites, apps and IT solutions for businesses anywhere — fixed quotes, a live preview while we build, and support after launch.", bn: "যেকোনো জায়গার ব্যবসার জন্য সফটওয়্যার, ওয়েবসাইট, অ্যাপ ও আইটি সলিউশন — নির্দিষ্ট দাম, বানানোর সময় লাইভ প্রিভিউ, আর লঞ্চের পর সাপোর্ট।" },
  "guides.title": { group: "Guides page", label: "Headline", en: "Shop smarter. Build smarter.", bn: "জেনে-বুঝে কিনুন, জেনে-বুঝে বানান।" },
} satisfies Record<string, { group: string; label: string; en: string; bn: string; long?: boolean }>;

export type FeatureKey = keyof typeof featureFields;
export const featureFields = {
  shopTabs: { group: "Homepage", label: "Shop tabs and product cards" },
  promiseStrip: { group: "Homepage", label: "Moving promise strip (delivery, bKash, Nagad…)" },
  deliveryPanel: { group: "Homepage", label: "Delivery checker and payment panel" },
  productStory: { group: "Homepage", label: "Product scroll story" },
  campaigns: { group: "Homepage", label: "Seasonal campaign banner" },
  bento: { group: "Homepage", label: "Why OANRO grid" },
  about: { group: "Homepage", label: "Who we are (We are OANRO.)" },
  values: { group: "Homepage", label: "O‑A‑N‑R‑O letters" },
  studio: { group: "Homepage", label: "Studio section" },
  studioProcess: { group: "Homepage", label: "Studio — How we work timeline" },
  studioDevices: { group: "Homepage", label: "Studio — one site on three screens" },
  contact: { group: "Homepage", label: "Contact box" },
  faq: { group: "Homepage", label: "Questions, answered" },
  buyBox: { group: "Product pages", label: "Price with delivery, delivery dates and return promise" },
  sizeGuide: { group: "Product pages", label: "Size guide" },
  completeLook: { group: "Product pages", label: "Complete the look" },
  stickyBuy: { group: "Product pages", label: "Sticky Add to bag bar on phones" },
  filters: { group: "Category pages", label: "Filters and sorting" },
  newsletter: { group: "Whole site", label: "Newsletter sign-up in the footer" },
  cursorRing: { group: "Whole site", label: "Desktop cursor ring" },
  studioPackages: { group: "Service pages", label: "Ways to work with us (packages)" },
  serviceFaq: { group: "Service pages", label: "Common questions (FAQ)" },
  socialIcons: { group: "Contact & social", label: "Social media icons in the footer" },
  whatsappButton: { group: "Contact & social", label: "Floating WhatsApp button (needs a WhatsApp number)" },
  whatsappOrder: { group: "Contact & social", label: "“Order on WhatsApp” button on product pages (needs a WhatsApp number)" },
  bottomBar: { group: "Phones", label: "Bottom tab bar on phones (Home, Shop, Search, Bag, Account)" },
  metaPixel: { group: "Marketing", label: "Meta (Facebook/Instagram) Pixel — needs a Pixel ID; loads only for visitors who allow analytics" },
  merchantFeed: { group: "Marketing", label: "Google Shopping product feed (/feed/google.xml)" },
} satisfies Record<string, { group: string; label: string }>;

export type Package = { name: Bi; for: Bi; includes: Bi[] };
export type Faq = { q: Bi; a: Bi };
export const socialPlatforms = ["facebook", "instagram", "tiktok", "x", "youtube", "linkedin", "messenger", "whatsapp", "telegram", "threads", "pinterest", "website"] as const;
export type SocialPlatform = typeof socialPlatforms[number];
/** icon: empty = the built-in icon for the platform, or a small uploaded image (data URL). */
export type Social = { platform: SocialPlatform; url: string; label: string; icon: string };
export type Contact = { email: string; phone: string; whatsapp: string; messenger: string; address: Bi; socials: Social[]; pixelId: string; pulseWhere: "everywhere" | "services" };
export type SiteContent = { text: Record<TextKey, Bi>; features: Record<FeatureKey, boolean>; guides: Guide[]; packages: Package[]; faq: Faq[]; contact: Contact };
export const emptyContact = (): Contact => ({ email: "", phone: "", whatsapp: "", messenger: "", address: { en: "", bn: "" }, socials: [], pixelId: "", pulseWhere: "everywhere" });

export function defaultContent(): SiteContent {
  return {
    text: Object.fromEntries(Object.entries(textFields).map(([k, f]) => [k, { en: f.en, bn: f.bn }])) as Record<TextKey, Bi>,
    features: Object.fromEntries(Object.keys(featureFields).map(k => [k, true])) as Record<FeatureKey, boolean>,
    guides: defaultGuides, packages: defaultPackages, faq: defaultFaq, contact: emptyContact(),
  };
}

// ---------- Validation (used when saving and when reading saved data, so bad data can never break a page) ----------
const str = (v: unknown, max: number) => typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";
const bi = (v: unknown, max: number): Bi | null => { const o = v as Record<string, unknown> | null; const en = str(o?.en, max); return en ? { en, bn: str(o?.bn, max) || en } : null; };
export const cleanText = (v: unknown) => Object.fromEntries(Object.keys(textFields).flatMap(k => { const b = bi((v as Record<string, unknown> | null)?.[k], 600); return b ? [[k, b]] : []; })) as Partial<Record<TextKey, Bi>>;
export const cleanFeatures = (v: unknown) => Object.fromEntries(Object.keys(featureFields).flatMap(k => { const x = (v as Record<string, unknown> | null)?.[k]; return typeof x === "boolean" ? [[k, x]] : []; })) as Partial<Record<FeatureKey, boolean>>;
export const cleanFaq = (v: unknown): Faq[] => (Array.isArray(v) ? v : []).slice(0, 30).flatMap(x => { const q = bi(x?.q, 200), a = bi(x?.a, 1200); return q && a ? [{ q, a }] : []; });
export const cleanPackages = (v: unknown): Package[] => (Array.isArray(v) ? v : []).slice(0, 8).flatMap(x => {
  const name = bi(x?.name, 80), f = bi(x?.for, 160); if (!name || !f) return [];
  return [{ name, for: f, includes: (Array.isArray(x?.includes) ? x.includes : []).slice(0, 10).flatMap((i: unknown) => { const b = bi(i, 160); return b ? [b] : []; }) }];
});
export const cleanGuides = (v: unknown): Guide[] => (Array.isArray(v) ? v : []).slice(0, 50).flatMap(x => {
  const slug = str(x?.slug, 60).toLowerCase(); const title = bi(x?.title, 140), summary = bi(x?.summary, 300);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title || !summary) return [];
  const sections = (Array.isArray(x?.sections) ? x.sections : []).slice(0, 20).flatMap((s: Record<string, unknown>) => { const h = bi(s?.heading, 140), b = bi(s?.body, 3000); return h && b ? [{ heading: h, body: b }] : []; });
  return sections.length ? [{ slug, title, summary, updated: /^\d{4}-\d{2}-\d{2}$/.test(str(x?.updated, 10)) ? str(x?.updated, 10) : new Date().toISOString().slice(0, 10), sections }] : [];
});
const httpsUrl = (v: unknown) => { const u = str(v, 300); try { const x = new URL(u); return x.protocol === "https:" ? x.toString() : ""; } catch { return ""; } };
const iconData = (v: unknown) => { const u = str(v, 16_000); return /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/.test(u) ? u : ""; };
/** Contact details, social links and marketing IDs. Bad values are dropped, never stored. */
export function cleanContact(v: unknown): Contact {
  const o = (v ?? {}) as Record<string, unknown>;
  const email = str(o.email, 120).toLowerCase();
  const digits = (x: unknown) => str(x, 20).replace(/[^\d+]/g, "");
  const address = bi(o.address, 160) ?? { en: "", bn: "" };
  const socials = (Array.isArray(o.socials) ? o.socials : []).slice(0, 12).flatMap((x: Record<string, unknown>) => {
    const platform = socialPlatforms.includes(x?.platform as SocialPlatform) ? x.platform as SocialPlatform : null; const url = httpsUrl(x?.url);
    return platform && url ? [{ platform, url, label: str(x?.label, 40), icon: iconData(x?.icon) }] : [];
  });
  return { email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) ? email : "", phone: digits(o.phone), whatsapp: digits(o.whatsapp).replace(/\D/g, ""), messenger: httpsUrl(o.messenger),
    address, socials, pixelId: /^\d{6,20}$/.test(str(o.pixelId, 20)) ? str(o.pixelId, 20) : "", pulseWhere: o.pulseWhere === "services" ? "services" : "everywhere" };
}
/** Saved changes on top of the defaults. Unknown or broken parts fall back to the default. */
export function mergeContent(saved: Partial<Record<keyof SiteContent, unknown>> | null): SiteContent {
  const d = defaultContent();
  if (!saved) return d;
  const guides = cleanGuides(saved.guides), packages = cleanPackages(saved.packages), faq = cleanFaq(saved.faq);
  return { text: { ...d.text, ...cleanText(saved.text) }, features: { ...d.features, ...cleanFeatures(saved.features) },
    guides: saved.guides !== undefined ? guides : d.guides, packages: saved.packages !== undefined ? packages : d.packages, faq: saved.faq !== undefined ? faq : d.faq,
    contact: saved.contact !== undefined ? cleanContact(saved.contact) : d.contact };
}
export const pick = (c: SiteContent, key: TextKey, locale: "en" | "bn") => c.text[key][locale] || c.text[key].en;
