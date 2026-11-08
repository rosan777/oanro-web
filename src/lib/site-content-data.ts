// What the owner can edit in Admin → Website content: texts (English + Bangla), homepage/page sections on/off,
// Guides, Studio packages and the service FAQ. Pure data (no server imports) so pages, the browser and tests share it.
import {
  guides as defaultGuides,
  serviceFaq as defaultFaq,
  studioPackages as defaultPackages,
  type Bi,
  type Guide,
} from "./content";

export type TextKey = keyof typeof textFields;

// Every editable text: its admin group and label, and the English and Bangla defaults.

export const textFields = {
  "hero.eyebrow": {
    group: "Homepage — hero",
    label: "Small line above the headline",
    en: "What you wear · What you build · Wherever you are",
    bn: "যা পরবেন · যা গড়বেন · যেখানেই থাকুন",
  },
  "hero.headline": {
    group: "Homepage — hero",
    label: "Main headline",
    en: "Built for what's next",
    bn: "আগামীর জন্য তৈরি",
  },
  "hero.lede": {
    group: "Homepage — hero",
    label: "Paragraph under the headline",
    long: true,
    en: "Shop winter clothing, caps, tech and jewelry with cash on delivery — or hire OANRO Studio for software, website and app development.",
    bn: "শীতের পোশাক, ক্যাপ, টেক ও জুয়েলারি কিনুন ক্যাশ অন ডেলিভারিতে — অথবা সফটওয়্যার, ওয়েবসাইট ও অ্যাপ বানাতে OANRO স্টুডিওকে বলুন।",
  },
  "hero.ctaShop": {
    group: "Homepage — hero",
    label: "Shop button",
    en: "Shop the collection",
    bn: "কালেকশন দেখুন",
  },
  "hero.ctaQuote": {
    group: "Homepage — hero",
    label: "Quote button",
    en: "Get a free quote",
    bn: "ফ্রি কোট নিন",
  },
  // Homepage in the approved design (Store + Studio hero, favourites, studio teaser, tiles).
  "home.eyebrow": {
    group: "Homepage — new design",
    label: "Small line above the headline",
    en: "A store. A studio. New possibilities.",
    bn: "একটি স্টোর। একটি স্টুডিও। নতুন সম্ভাবনা।",
  },
  "home.line1": {
    group: "Homepage — new design",
    label: "Headline, first line",
    en: "Good things.",
    bn: "পছন্দের জিনিস।",
  },
  "home.line2": {
    group: "Homepage — new design",
    label: "Headline, highlighted second line",
    en: "Bigger ideas.",
    bn: "বড় আইডিয়া।",
  },
  "home.lede": {
    group: "Homepage — new design",
    label: "Paragraph under the headline",
    long: true,
    en: "Find something for your everyday. Build something for your tomorrow. Welcome to a different kind of OANRO.",
    bn: "প্রতিদিনের জন্য কিছু খুঁজুন। আগামী দিনের জন্য কিছু তৈরি করুন। OANRO-তে স্বাগতম।",
  },
  "home.ctaStore": {
    group: "Homepage — new design",
    label: "Store button",
    en: "Explore the store",
    bn: "স্টোর ঘুরে দেখুন",
  },
  "home.ctaStudio": {
    group: "Homepage — new design",
    label: "Studio button",
    en: "Meet the studio",
    bn: "স্টুডিও দেখুন",
  },
  "home.strip": {
    group: "Homepage — new design",
    label: "Brand strip (separate the phrases with |)",
    en: "Chosen with care|Made for everyday|Designed for what’s next",
    bn: "যত্নে বাছাই|প্রতিদিনের জন্য|আগামীর কথা ভেবে",
  },
  "home.favourites": {
    group: "Homepage — new design",
    label: "Newest products heading",
    en: "New favourites.",
    bn: "নতুন পছন্দ।",
  },
  "home.studioTitle": {
    group: "Homepage — new design",
    label: "Studio teaser heading",
    en: "Not just a website.",
    bn: "শুধু ওয়েবসাইট নয়।",
  },
  "home.studioAccent": {
    group: "Homepage — new design",
    label: "Studio teaser second line",
    en: "Your next chapter.",
    bn: "আপনার নতুন অধ্যায়।",
  },
  "home.studioLede": {
    group: "Homepage — new design",
    label: "Studio teaser paragraph",
    long: true,
    en: "Websites, apps and business software. Thoughtfully connected, from the first idea to the everyday details.",
    bn: "ওয়েবসাইট, অ্যাপ ও বিজনেস সফটওয়্যার। প্রথম আইডিয়া থেকে প্রতিদিনের কাজে।",
  },
  "home.tiles": {
    group: "Homepage — new design",
    label: "Wishlist / workspace / account tiles heading",
    en: "One OANRO. Your way.",
    bn: "এক OANRO। আপনার মতো।",
  },
  "about.eyebrow": {
    group: "Homepage — who we are",
    label: "Small label",
    en: "Who we are",
    bn: "আমরা কারা",
  },
  "about.title": {
    group: "Homepage — who we are",
    label: "Heading",
    en: "We are OANRO.",
    bn: "আমরা OANRO।",
  },
  "about.body": {
    group: "Homepage — who we are",
    label: "Paragraph",
    long: true,
    en: "Built for what's next. Every product we offer is chosen with intent, and every website, app and system we build is held to one standard — fast, honest and made to last. When our name is on it, it has to be right.",
    bn: "আগামীর জন্য তৈরি। আমাদের প্রতিটি পণ্য উদ্দেশ্য নিয়ে বাছাই করা, আর প্রতিটি ওয়েবসাইট, অ্যাপ ও সিস্টেম একটিই মানে তৈরি — দ্রুত, সৎ ও টেকসই। যেখানে আমাদের নাম থাকে, সেখানে কাজটা ঠিক হতেই হবে।",
  },
  "bento.title": {
    group: "Homepage — why OANRO",
    label: "Heading",
    en: "Made simple, from order to doorstep.",
    bn: "অর্ডার থেকে দরজা পর্যন্ত — সহজ।",
  },
  "studio.eyebrow": {
    group: "Homepage — studio",
    label: "Small label",
    en: "OANRO Studio · Software, web, app & IT solutions",
    bn: "OANRO স্টুডিও · সফটওয়্যার, ওয়েব, অ্যাপ ও আইটি সলিউশন",
  },
  "studio.headline": {
    group: "Homepage — studio",
    label: "Heading (use | for a new line)",
    en: "We build it.|You run your business.",
    bn: "আমরা বানাই।|আপনি ব্যবসা চালান।",
  },
  "studio.lede": {
    group: "Homepage — studio",
    label: "Paragraph",
    long: true,
    en: "Software, websites, apps and IT solutions for businesses anywhere — a fixed quote, a live preview, launched on your own domain.",
    bn: "যেকোনো জায়গার ব্যবসার জন্য সফটওয়্যার, ওয়েবসাইট, অ্যাপ ও আইটি সলিউশন — নির্দিষ্ট দাম, লাইভ প্রিভিউ, আপনার নিজের ডোমেইনে লঞ্চ।",
  },
  "contact.title": {
    group: "Homepage — contact",
    label: "Heading",
    en: "Let's start a conversation",
    bn: "চলুন কথা শুরু করি",
  },
  "contact.body": {
    group: "Homepage — contact",
    label: "Paragraph",
    en: "A question about a product, a service or a project? A real person from our team replies.",
    bn: "পণ্য, সেবা বা প্রজেক্ট নিয়ে প্রশ্ন? আমাদের টিমের একজন মানুষ উত্তর দেবেন।",
  },
  "footer.tagline": {
    group: "Footer",
    label: "Brand line",
    en: "Thoughtfully chosen products and dependable technology, made for the way you live and work.",
    bn: "যত্নে বাছাই করা পণ্য আর নির্ভরযোগ্য প্রযুক্তি — আপনার জীবন ও কাজের জন্য তৈরি।",
  },
  "aboutPage.headline": {
    group: "About page",
    label: "Headline",
    en: "Built for what's next.",
    bn: "আগামীর জন্য তৈরি।",
  },
  "aboutPage.lede": {
    group: "About page",
    label: "Intro paragraph",
    long: true,
    en: "OANRO is two things under one name: a store of thoughtfully chosen products, and a studio that builds software, websites and apps. Both run on the same promise — when our name is on it, it has to be right.",
    bn: "OANRO এক নামে দুটি কাজ: যত্নে বাছাই করা পণ্যের একটি স্টোর, আর সফটওয়্যার, ওয়েবসাইট ও অ্যাপ বানানোর একটি স্টুডিও। দুটোই একই প্রতিশ্রুতিতে চলে — যেখানে আমাদের নাম থাকে, সেখানে কাজটা ঠিক হতেই হবে।",
  },
  "aboutPage.store": {
    group: "About page",
    label: "The store",
    long: true,
    en: "Winter clothing, caps, tech and jewelry — picked one by one, described honestly, delivered across Bangladesh with cash on delivery, bKash or Nagad. If something arrives wrong or damaged, we fix it.",
    bn: "শীতের পোশাক, ক্যাপ, টেক আর জুয়েলারি — একটি একটি করে বাছাই, সৎভাবে বর্ণনা, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি, বিকাশ বা নগদে ডেলিভারি। ভুল বা ক্ষতিগ্রস্ত পণ্য এলে আমরা ঠিক করে দিই।",
  },
  "aboutPage.studio": {
    group: "About page",
    label: "The studio",
    long: true,
    en: "Software, websites, apps and IT solutions for businesses anywhere — fixed quotes, a live preview while we build, and support after launch.",
    bn: "যেকোনো জায়গার ব্যবসার জন্য সফটওয়্যার, ওয়েবসাইট, অ্যাপ ও আইটি সলিউশন — নির্দিষ্ট দাম, বানানোর সময় লাইভ প্রিভিউ, আর লঞ্চের পর সাপোর্ট।",
  },
  "menu.products": {
    group: "Menu pictures",
    label: "Label on the Products menu picture",
    en: "New season",
    bn: "নতুন সিজন",
  },
  "menu.services": {
    group: "Menu pictures",
    label: "Label on the Services menu picture",
    en: "OANRO Studio",
    bn: "OANRO স্টুডিও",
  },
  "menu.about": {
    group: "Menu pictures",
    label: "Label on the About menu picture",
    en: "Our story",
    bn: "আমাদের গল্প",
  },
  "guides.title": {
    group: "Guides page",
    label: "Headline",
    en: "Shop smarter. Build smarter.",
    bn: "জেনে-বুঝে কিনুন, জেনে-বুঝে বানান।",
  },
} satisfies Record<
  string,
  { group: string; label: string; en: string; bn: string; long?: boolean }
>;

export type FeatureKey = keyof typeof featureFields;

/** Switches that start off for a new or never-saved site. */
const offByDefault: FeatureKey[] = [
  "brandHero",
  "intro",
  "categoryTiles",
  "trustStrip",
  "doubleConveyor",
  "serviceConveyor",
  "standardPanel",
  "valueFan",
  "featureStory",
  "howWeWork",
];

// On/off switches for page sections and features.

export const featureFields = {
  designHero: { group: "Homepage", label: "Hero: store + studio (new design)" },
  brandHero: { group: "Homepage", label: "Hero: animated brand headline (previous design)" },
  homeFavourites: { group: "Homepage", label: "New favourites (newest products)" },
  studioTeaser: { group: "Homepage", label: "Studio teaser with workspace preview" },
  discoveryTiles: { group: "Homepage", label: "Wishlist / workspace / account tiles" },
  shopTabs: { group: "Homepage", label: "Shop tabs and product cards" },
  promiseStrip: { group: "Homepage", label: "Moving promise strip (delivery, services…)" },
  paymentRow: { group: "Homepage", label: "Pay your way row (bKash, Nagad, cash on delivery)" },
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
  categoryTiles: { group: "Extra homepage sections", label: "Shop by category tiles" },
  trustStrip: {
    group: "Extra homepage sections",
    label: "Four promises strip (delivery, payment, returns, support)",
  },
  doubleConveyor: {
    group: "Extra homepage sections",
    label: "Two scrolling rows: products, services and principles",
  },
  serviceConveyor: {
    group: "Extra homepage sections",
    label: "Technology services in a scrolling row",
  },
  standardPanel: { group: "Extra homepage sections", label: "“The OANRO standard” panel" },
  valueFan: {
    group: "Extra homepage sections",
    label: "Four value cards that fan out while scrolling",
  },
  featureStory: {
    group: "Extra homepage sections",
    label: "Older feature story (campaign photo, headphone story, highlights, 3D model)",
  },
  howWeWork: {
    group: "Extra homepage sections",
    label: "How we work: steps from first chat to delivery",
  },
  buyBox: {
    group: "Product pages",
    label: "Price with delivery, delivery dates and return promise",
  },
  sizeGuide: { group: "Product pages", label: "Size guide" },
  completeLook: { group: "Product pages", label: "Complete the look" },
  stickyBuy: { group: "Product pages", label: "Sticky Add to bag bar on phones" },
  filters: { group: "Category pages", label: "Filters and sorting" },
  newsletter: { group: "Whole site", label: "Newsletter sign-up in the footer" },
  cursorRing: { group: "Whole site", label: "Desktop cursor ring" },
  intro: { group: "Whole site", label: "Welcome intro animation (logo splash on first visit)" },
  studioPackages: { group: "Service pages", label: "Ways to work with us (packages)" },
  serviceFaq: { group: "Service pages", label: "Common questions (FAQ)" },
  socialIcons: { group: "Contact & social", label: "Social media icons in the footer" },
  whatsappButton: {
    group: "Contact & social",
    label: "Floating WhatsApp button (needs a WhatsApp number)",
  },
  whatsappOrder: {
    group: "Contact & social",
    label: "“Order on WhatsApp” button on product pages (needs a WhatsApp number)",
  },
  bottomBar: {
    group: "Phones",
    label: "Bottom tab bar on phones (Home, Shop, Search, Bag, Account)",
  },
  metaPixel: {
    group: "Marketing",
    label:
      "Meta (Facebook/Instagram) Pixel — needs a Pixel ID; loads only for visitors who allow analytics",
  },
  merchantFeed: { group: "Marketing", label: "Google Shopping product feed (/feed/google.xml)" },
  googleAnalytics: {
    group: "Marketing",
    label:
      "Google Analytics — needs a Measurement ID in the server settings; loads only for visitors who allow analytics",
  },
} satisfies Record<string, { group: string; label: string }>;

export type Package = { name: Bi; for: Bi; includes: Bi[] };
export type Faq = { q: Bi; a: Bi };
export const socialPlatforms = [
  "facebook",
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "messenger",
  "whatsapp",
  "telegram",
  "threads",
  "pinterest",
  "website",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
/** icon: empty = the built-in icon for the platform, or a small uploaded image (data URL). */
export type Social = { platform: SocialPlatform; url: string; label: string; icon: string };
export type Contact = {
  email: string;
  phone: string;
  whatsapp: string;
  messenger: string;
  address: Bi;
  socials: Social[];
  pixelId: string;
  pulseWhere: "everywhere" | "services";
};
/** Owner-uploaded images (Admin → Website content → Images). Only version stamps travel to pages; the image itself is at /api/site-media/<key>?v=<stamp>. */
export type MediaSlot = "menu-products" | "menu-services" | "menu-about" | "share";
export const mediaUrl = (c: Pick<SiteContent, "media">, key: MediaSlot) =>
  c.media[key] ? `/api/site-media/${key}?v=${c.media[key]}` : "";
export type FeatureSettings = Record<FeatureKey, boolean> & { featuredProductSlug: string };
export type SiteContent = {
  text: Record<TextKey, Bi>;
  features: FeatureSettings;
  guides: Guide[];
  packages: Package[];
  /** Software page plans (quote-only: no prices, no subscriptions). */
  softwarePlans: Package[];
  faq: Faq[];
  contact: Contact;
  media: Partial<Record<MediaSlot, string>>;
};
export const emptyContact = (): Contact => ({
  email: "",
  phone: "",
  whatsapp: "",
  messenger: "",
  address: { en: "", bn: "" },
  socials: [],
  pixelId: "",
  pulseWhere: "everywhere",
});

/** Software page plans from the approved design. Quote-only: no prices or subscriptions are offered. */
const biText = (en: string, bn: string): Bi => ({ en, bn });
export const defaultSoftwarePlans: Package[] = [
  {
    name: biText("Essential", "এসেনশিয়াল"),
    for: biText("A clear place to start.", "শুরুর জন্য পরিষ্কার জায়গা।"),
    includes: [
      biText("Project overview", "প্রজেক্টের সারসংক্ষেপ"),
      biText("Shared files", "শেয়ার করা ফাইল"),
      biText("Progress updates", "অগ্রগতির আপডেট"),
    ],
  },
  {
    name: biText("Business", "বিজনেস"),
    for: biText("Bring the whole picture together.", "পুরো ছবিটা এক জায়গায়।"),
    includes: [
      biText("Everything in Essential", "এসেনশিয়ালের সব কিছু"),
      biText("Approval workflows", "অনুমোদনের ধাপ"),
      biText("Invoices & reporting", "ইনভয়েস ও রিপোর্ট"),
      biText("Team collaboration", "টিমের সাথে কাজ"),
    ],
  },
  {
    name: biText("Custom", "কাস্টম"),
    for: biText("Built around your business.", "আপনার ব্যবসাকে ঘিরে তৈরি।"),
    includes: [
      biText("Custom workflows", "নিজস্ব কাজের ধারা"),
      biText("Integrations & migration", "ইন্টিগ্রেশন ও ডেটা স্থানান্তর"),
      biText("Roles & permissions", "রোল ও অনুমতি"),
      biText("Dedicated implementation", "নিবেদিত বাস্তবায়ন"),
    ],
  },
];

/** Built-in content used until the owner saves changes. */
export function defaultContent(): SiteContent {
  return {
    text: Object.fromEntries(
      Object.entries(textFields).map(([k, f]) => [k, { en: f.en, bn: f.bn }]),
    ) as Record<TextKey, Bi>,
    // Everything starts on, except the logo intro and the extra homepage sections: they were never on the
    // live site, so they stay hidden until the owner switches them on.
    features: {
      ...Object.fromEntries(
        Object.keys(featureFields).map(k => [k, !offByDefault.includes(k as FeatureKey)]),
      ),
      featuredProductSlug: "",
    } as FeatureSettings,
    guides: defaultGuides,
    packages: defaultPackages,
    softwarePlans: defaultSoftwarePlans,
    faq: defaultFaq,
    contact: emptyContact(),
    media: {},
  };
}

// ---------- Validation (used when saving and when reading saved data, so bad data can never break a page) ----------
const str = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim()
        .slice(0, max)
    : "";
const bi = (v: unknown, max: number): Bi | null => {
  const o = v as Record<string, unknown> | null;
  const en = str(o?.en, max);
  return en ? { en, bn: str(o?.bn, max) || en } : null;
};

/** Clean-up functions for each editable part: unknown keys dropped, lengths limited. */
export const cleanText = (v: unknown) =>
  Object.fromEntries(
    Object.keys(textFields).flatMap(k => {
      const b = bi((v as Record<string, unknown> | null)?.[k], 600);
      return b ? [[k, b]] : [];
    }),
  ) as Partial<Record<TextKey, Bi>>;
export const cleanFeatures = (v: unknown) => {
  const o = v as Record<string, unknown> | null;
  const slug = str(o?.featuredProductSlug, 100).toLowerCase();
  return {
    ...Object.fromEntries(
      Object.keys(featureFields).flatMap(k => (typeof o?.[k] === "boolean" ? [[k, o[k]]] : [])),
    ),
    featuredProductSlug: !slug || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "",
  } as Partial<FeatureSettings>;
};
export const cleanFaq = (v: unknown): Faq[] =>
  (Array.isArray(v) ? v : []).slice(0, 30).flatMap(x => {
    const q = bi(x?.q, 200),
      a = bi(x?.a, 1200);
    return q && a ? [{ q, a }] : [];
  });
export const cleanPackages = (v: unknown): Package[] =>
  (Array.isArray(v) ? v : []).slice(0, 8).flatMap(x => {
    const name = bi(x?.name, 80),
      f = bi(x?.for, 160);
    if (!name || !f) return [];
    return [
      {
        name,
        for: f,
        includes: (Array.isArray(x?.includes) ? x.includes : [])
          .slice(0, 10)
          .flatMap((i: unknown) => {
            const b = bi(i, 160);
            return b ? [b] : [];
          }),
      },
    ];
  });
export const cleanGuides = (v: unknown): Guide[] =>
  (Array.isArray(v) ? v : []).slice(0, 50).flatMap(x => {
    const slug = str(x?.slug, 60).toLowerCase();
    const title = bi(x?.title, 140),
      summary = bi(x?.summary, 300);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title || !summary) return [];
    const sections = (Array.isArray(x?.sections) ? x.sections : [])
      .slice(0, 20)
      .flatMap((s: Record<string, unknown>) => {
        const h = bi(s?.heading, 140),
          b = bi(s?.body, 3000);
        return h && b ? [{ heading: h, body: b }] : [];
      });
    return sections.length
      ? [
          {
            slug,
            title,
            summary,
            updated: /^\d{4}-\d{2}-\d{2}$/.test(str(x?.updated, 10))
              ? str(x?.updated, 10)
              : new Date().toISOString().slice(0, 10),
            sections,
          },
        ]
      : [];
  });

// Contact field helpers: only https links, and small inline icon images.

const httpsUrl = (v: unknown) => {
  const u = str(v, 300);
  try {
    const x = new URL(u);
    return x.protocol === "https:" ? x.toString() : "";
  } catch {
    return "";
  }
};
const iconData = (v: unknown) => {
  const u = str(v, 16_000);
  return /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/.test(u) ? u : "";
};
/** Contact details, social links and marketing IDs. Bad values are dropped, never stored. */
export function cleanContact(v: unknown): Contact {
  const o = (v ?? {}) as Record<string, unknown>;
  const email = str(o.email, 120).toLowerCase();
  const digits = (x: unknown) => str(x, 20).replace(/[^\d+]/g, "");
  const address = bi(o.address, 160) ?? { en: "", bn: "" };
  const socials = (Array.isArray(o.socials) ? o.socials : [])
    .slice(0, 12)
    .flatMap((x: Record<string, unknown>) => {
      const platform = socialPlatforms.includes(x?.platform as SocialPlatform)
        ? (x.platform as SocialPlatform)
        : null;
      const url = httpsUrl(x?.url);
      return platform && url
        ? [{ platform, url, label: str(x?.label, 40), icon: iconData(x?.icon) }]
        : [];
    });
  return {
    email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) ? email : "",
    phone: digits(o.phone),
    whatsapp: digits(o.whatsapp).replace(/\D/g, ""),
    messenger: httpsUrl(o.messenger),
    address,
    socials,
    pixelId: /^\d{6,20}$/.test(str(o.pixelId, 20)) ? str(o.pixelId, 20) : "",
    pulseWhere: o.pulseWhere === "services" ? "services" : "everywhere",
  };
}
/** Saved changes on top of the defaults. Unknown or broken parts fall back to the default. */
export function mergeContent(
  saved: Partial<Record<keyof SiteContent, unknown>> | null,
): SiteContent {
  const d = defaultContent();
  if (!saved) return d;
  const guides = cleanGuides(saved.guides),
    packages = cleanPackages(saved.packages),
    softwarePlans = cleanPackages(saved.softwarePlans),
    faq = cleanFaq(saved.faq);
  return {
    text: { ...d.text, ...cleanText(saved.text) },
    features: { ...d.features, ...cleanFeatures(saved.features) },
    guides: saved.guides !== undefined ? guides : d.guides,
    packages: saved.packages !== undefined ? packages : d.packages,
    softwarePlans: saved.softwarePlans !== undefined ? softwarePlans : d.softwarePlans,
    faq: saved.faq !== undefined ? faq : d.faq,
    contact: saved.contact !== undefined ? cleanContact(saved.contact) : d.contact,
    media: {},
  };
}

/** One text in the page language; empty Bangla falls back to English. */
export const pick = (c: SiteContent, key: TextKey, locale: "en" | "bn") =>
  c.text[key][locale] || c.text[key].en;
