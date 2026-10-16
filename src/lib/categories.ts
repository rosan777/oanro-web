// Fixed category choices per section type, with Bangla labels. Pure data: safe for client and server.
export type Option = { en: string; bn: string };
export const collectionPresets = ["seasonal", "caps", "tech", "general"] as const;
export type CollectionPreset = typeof collectionPresets[number];
export const presetLabel: Record<CollectionPreset, Option> = {
  seasonal: { en: "Seasonal products", bn: "মৌসুমি পণ্য" }, caps: { en: "Caps", bn: "ক্যাপ" },
  tech: { en: "Tech items", bn: "টেক আইটেম" }, general: { en: "General products", bn: "সাধারণ পণ্য" },
};
export const productCategories: Record<CollectionPreset, Option[]> = {
  seasonal: [
    { en: "Winter wear", bn: "শীতের পোশাক" }, { en: "Summer wear", bn: "গরমের পোশাক" }, { en: "Eid & festive wear", bn: "ঈদ ও উৎসবের পোশাক" },
    { en: "Sweaters & knitwear", bn: "সোয়েটার ও নিটওয়্যার" }, { en: "Jackets & outerwear", bn: "জ্যাকেট ও আউটারওয়্যার" },
    { en: "Shirts & tops", bn: "শার্ট ও টপস" }, { en: "Scarves, shawls & gloves", bn: "স্কার্ফ, শাল ও গ্লাভস" },
    { en: "Accessories", bn: "অ্যাকসেসরিজ" }, { en: "Bags", bn: "ব্যাগ" }, { en: "Footwear", bn: "জুতা" }, { en: "Home & lifestyle", bn: "হোম ও লাইফস্টাইল" },
  ],
  caps: [
    { en: "Baseball caps", bn: "বেসবল ক্যাপ" }, { en: "Snapback caps", bn: "স্ন্যাপব্যাক ক্যাপ" }, { en: "Sports caps", bn: "স্পোর্টস ক্যাপ" },
    { en: "Winter caps & beanies", bn: "শীতের ক্যাপ ও বিনি" }, { en: "Trucker caps", bn: "ট্রাকার ক্যাপ" }, { en: "Bucket hats", bn: "বাকেট হ্যাট" },
    { en: "Dad caps", bn: "ড্যাড ক্যাপ" }, { en: "Kids caps", bn: "শিশুদের ক্যাপ" }, { en: "Custom & printed caps", bn: "কাস্টম ও প্রিন্টেড ক্যাপ" },
  ],
  tech: [
    { en: "Digital watches & smartwatches", bn: "ডিজিটাল ঘড়ি ও স্মার্টওয়াচ" }, { en: "Headphones & earbuds", bn: "হেডফোন ও ইয়ারবাডস" },
    { en: "Speakers", bn: "স্পিকার" }, { en: "Keyboards", bn: "কিবোর্ড" }, { en: "Computer mice", bn: "কম্পিউটার মাউস" },
    { en: "Chargers, cables & power banks", bn: "চার্জার, ক্যাবল ও পাওয়ার ব্যাংক" }, { en: "Phone accessories", bn: "ফোন অ্যাকসেসরিজ" },
    { en: "Computer accessories", bn: "কম্পিউটার অ্যাকসেসরিজ" }, { en: "Gaming accessories", bn: "গেমিং অ্যাকসেসরিজ" },
    { en: "Smart home devices", bn: "স্মার্ট হোম ডিভাইস" }, { en: "Storage & memory", bn: "স্টোরেজ ও মেমরি" }, { en: "Networking", bn: "নেটওয়ার্কিং" },
  ],
  general: [{ en: "New arrivals", bn: "নতুন পণ্য" }, { en: "Best sellers", bn: "সেরা বিক্রিত" }, { en: "Gifts", bn: "উপহার" }, { en: "Bundles & offers", bn: "বান্ডেল ও অফার" }],
};
export const serviceCategories: Option[] = [
  { en: "Web development", bn: "ওয়েব ডেভেলপমেন্ট" }, { en: "E-commerce", bn: "ই-কমার্স" }, { en: "Mobile applications", bn: "মোবাইল অ্যাপ্লিকেশন" },
  { en: "Business software", bn: "বিজনেস সফটওয়্যার" }, { en: "Automation", bn: "অটোমেশন" }, { en: "UI/UX design", bn: "UI/UX ডিজাইন" },
  { en: "Technology strategy", bn: "টেকনোলজি স্ট্র্যাটেজি" }, { en: "Hosting & maintenance", bn: "হোস্টিং ও রক্ষণাবেক্ষণ" },
  { en: "Digital marketing", bn: "ডিজিটাল মার্কেটিং" }, { en: "IT support", bn: "আইটি সাপোর্ট" },
];
/** Bangla label for a known English category, so storefront Bangla text can fall back to it. */
export function categoryBn(en: string) {
  for (const list of [...Object.values(productCategories), serviceCategories]) { const hit = list.find(o => o.en === en); if (hit) return hit.bn; }
  return "";
}
