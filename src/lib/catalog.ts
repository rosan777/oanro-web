export type ProductCopy = { name: string; category: string; tagline: string; description: string; specs: [string, string][] };
export type Product = {
  slug: string; name: string; category: string; tagline: string; description: string;
  price: number; position: string; sizes: string[]; specs: [string, string][];
  /** Same-origin image URL for owner-uploaded photos; null uses the sample sprite at `position`. */
  image?: string | null; bn?: ProductCopy | null; collectionId?: string;
  /** Public availability only. The stock count itself is never sent to customers. */
  inStock?: boolean;
};
export type ServiceCopy = { title: string; text: string; detail: string };
export type Service = { slug: string; title: string; word: string; text: string; detail: string; category?: string; image?: string | null; bn?: ServiceCopy | null };
/** A storefront row of products. `anchor` keeps existing in-page links (#products, #caps, #tech-items) working. */
export type StoreCollection = { id: string; slug: string; preset: "seasonal" | "caps" | "tech" | "general"; name: string; headline: string; description: string; anchor: string; bn?: { name: string; headline: string; description: string } | null };
// Demo catalog: shown until the owner adds or imports products in the database.
export const products: Product[] = [
  { slug: "forest-knit", name: "The Forest Knit", category: "Winter essentials", tagline: "Texture you can feel.",
    description: "A cable-knit concept in deep forest green. Explore the texture, the relaxed silhouette, and the little details that make a winter layer feel special.",
    price: 2490, position: "0% 0%", sizes: ["S", "M", "L", "XL"],
    specs: [["Concept", "Cable-knit sweater"], ["Color", "Forest green"], ["Fit direction", "Relaxed"], ["Material", "To be confirmed before sale"]], bn: { name: "দ্য ফরেস্ট নিট", category: "শীতের প্রয়োজনীয়", tagline: "যে টেক্সচার অনুভব করা যায়।", description: "গাঢ় ফরেস্ট গ্রিন রঙের কেবল-নিট কনসেপ্ট। এর টেক্সচার, আরামদায়ক সিলুয়েট ও ছোট বিশেষ দিকগুলো দেখুন।", specs: [["কনসেপ্ট", "কেবল-নিট সোয়েটার"], ["রং", "ফরেস্ট গ্রিন"], ["ফিট", "আরামদায়ক"], ["ম্যাটেরিয়াল", "বিক্রয়ের আগে নিশ্চিত করা হবে"]] } },
  { slug: "charcoal-overshirt", name: "The Everyday Layer", category: "Modern layers", tagline: "A little structure. A lot of ease.",
    description: "A charcoal overshirt concept with clean lines and an easy shape. A versatile visual direction for OANRO's first seasonal collection.",
    price: 2990, position: "100% 0%", sizes: ["S", "M", "L", "XL"],
    specs: [["Concept", "Button-front overshirt"], ["Color", "Charcoal"], ["Style", "Layering piece"], ["Fabric weight", "To be confirmed before sale"]], bn: { name: "দ্য এভরিডে লেয়ার", category: "আধুনিক লেয়ার", tagline: "অল্প গঠন, অনেক স্বাচ্ছন্দ্য।", description: "পরিষ্কার লাইন ও সহজ আকৃতির চারকোল ওভারশার্ট কনসেপ্ট।", specs: [["কনসেপ্ট", "বোতামযুক্ত ওভারশার্ট"], ["রং", "চারকোল"], ["স্টাইল", "লেয়ারিং পিস"], ["ফ্যাব্রিক", "বিক্রয়ের আগে নিশ্চিত করা হবে"]] } },
  { slug: "winter-set", name: "The Winter Pair", category: "Accessories", tagline: "Small details. Warmer days.",
    description: "A coordinated scarf and beanie concept. Deep green and charcoal bring a quiet finishing touch to colder days.",
    price: 1190, position: "0% 100%", sizes: ["One size"],
    specs: [["Concept", "Scarf and beanie pair"], ["Palette", "Forest green / charcoal"], ["Sizing", "One-size concept"], ["Dimensions", "To be confirmed before sale"]], bn: { name: "দ্য উইন্টার পেয়ার", category: "অ্যাকসেসরিজ", tagline: "ছোট বিস্তারিত, উষ্ণ দিন।", description: "মিলিয়ে নেওয়া স্কার্ফ ও বিনি কনসেপ্ট, শীতের দিনের জন্য শান্ত সমাপ্তি।", specs: [["কনসেপ্ট", "স্কার্ফ ও বিনি জোড়া"], ["রঙের সমন্বয়", "ফরেস্ট গ্রিন / চারকোল"], ["সাইজ", "এক সাইজ"], ["মাত্রা", "বিক্রয়ের আগে নিশ্চিত করা হবে"]] } },
  { slug: "studio-headphones", name: "Studio Wireless", category: "Technology", tagline: "Make room for your sound.",
    description: "An over-ear headphone concept with sculpted cushions and a considered silhouette. Explore the sample imagery and an interactive 3D concept model.",
    price: 4990, position: "100% 100%", sizes: ["Standard"], collectionId: "tech",
    specs: [["Concept", "Over-ear wireless headphones"], ["Color", "Matte black"], ["3D model", "Illustrative concept, not engineering geometry"], ["Battery and connectivity", "To be verified before sale"]], bn: { name: "স্টুডিও ওয়্যারলেস", category: "টেকনোলজি", tagline: "আপনার শব্দের জন্য জায়গা রাখুন।", description: "আকৃতিবদ্ধ কুশন ও চিন্তাশীল সিলুয়েটের ওভার-ইয়ার হেডফোন কনসেপ্ট। নমুনা ছবি ও ইন্টারঅ্যাকটিভ 3D মডেল দেখুন।", specs: [["কনসেপ্ট", "ওভার-ইয়ার ওয়্যারলেস হেডফোন"], ["রং", "ম্যাট ব্ল্যাক"], ["3D মডেল", "দৃষ্টান্তমূলক কনসেপ্ট, প্রকৌশল নকশা নয়"], ["ব্যাটারি ও সংযোগ", "বিক্রয়ের আগে যাচাই করা হবে"]] } },
];
export const services: Service[] = [
  { slug: "web", title: "Web development", word: "WEB", text: "A thoughtful home for your business online.", detail: "Websites, customer portals, and commerce experiences built around your audience and business goals." },
  { slug: "app", title: "Mobile applications", word: "APP", text: "Practical ideas, ready for everyday life.", detail: "Explore mobile app requirements, platform choices, and an achievable delivery plan." },
  { slug: "systems", title: "Business software", word: "BUILD", text: "Bring your work into a clearer system.", detail: "Tools for orders, inventory, reporting, and the workflows your business depends on." },
  { slug: "strategy", title: "Technology strategy", word: "NEXT", text: "A clearer direction for what comes next.", detail: "Review your current tools, identify priorities, and define a practical next step." },
];
const bnDigits = "০১২৩৪৫৬৭৮৯";
/**
 * Taka price with Bangladeshi (lakh) grouping, e.g. ৳4,990 or ৳1,25,000.
 * Deliberately avoids Intl currency formatting: Node and browsers ship different ICU data
 * ("BDT 4,990" vs "4,990৳"), which caused server/client hydration mismatches.
 */
export function formatPrice(value: number, locale: "en" | "bn" = "en") {
  const digits = String(Math.abs(Math.round(value)));
  const last3 = digits.slice(-3), rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  const text = `${value < 0 ? "-" : ""}৳${grouped}`;
  return locale === "bn" ? text.replace(/\d/g, d => bnDigits[Number(d)]) : text;
}
export const collectionAnchor = (slug: string) => ({ seasonal: "products", caps: "caps", tech: "tech-items" } as Record<string, string>)[slug] ?? `collection-${slug}`;
// Fallback rows used before the collections migration runs (mirrors the seeded rows).
export const demoCollections: StoreCollection[] = [
  { id: "seasonal", slug: "seasonal", preset: "seasonal", name: "Seasonal collection", headline: "Your next discovery.", description: "A first look at the possibilities. Sample products, made for exploration.", anchor: "products" },
  { id: "caps", slug: "caps", preset: "caps", name: "Caps collection", headline: "Find your fit.", description: "Cap styles we're exploring. Product details and availability will appear when confirmed.", anchor: "caps" },
  { id: "tech", slug: "tech", preset: "tech", name: "Tech items", headline: "Everyday technology.", description: "A preview of technology categories. Products will appear as they are confirmed.", anchor: "tech-items" },
];
/** A running seasonal campaign as shown on the storefront. */
export type StoreCampaign = { id: string; slug: string; name: string; headline: string; description: string; image: string | null; endsAt: string | null; productSlugs: string[]; bn?: { name: string; headline: string; description: string } | null };
