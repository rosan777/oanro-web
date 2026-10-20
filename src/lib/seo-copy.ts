import type { Locale } from "@/lib/locale-path";
import type { CollectionPreset } from "@/lib/categories";

// Helpful, always-true text for category and service pages, so each page has enough real words to rank.
// It sits under the owner's own description from admin. Keep claims factual: no prices, dates or guarantees here.
type Guide = { heading: string; paragraphs: string[] };

const presetCopy: Record<CollectionPreset, { en: string; bn: string }> = {
  seasonal: {
    en: "Seasonal clothing works best when it fits the weather you actually live in. Winters can be short but sharp, especially in the early mornings, so this collection focuses on layers you can add or remove through the day: knitwear, overshirts, scarves and other warm essentials. Each product page lists the available sizes and details so you can choose with confidence.",
    bn: "যে আবহাওয়ায় আপনি থাকেন, তার সঙ্গে মানানসই মৌসুমি পোশাকই সবচেয়ে কাজের। শীত ছোট হলেও কখনো বেশ তীব্র, বিশেষ করে ভোরবেলায়। তাই এই কালেকশনে রাখা হয়েছে এমন লেয়ার, যা দিনের মধ্যে পরা বা খুলে রাখা যায়: নিটওয়্যার, ওভারশার্ট, স্কার্ফ ও অন্যান্য গরম পোশাক। প্রতিটি পণ্যের পেজে সাইজ ও বিস্তারিত তথ্য দেওয়া আছে, যাতে নিশ্চিন্তে বেছে নিতে পারেন।",
  },
  caps: {
    en: "A good cap is about fit, fabric and how often you will actually wear it. This collection brings together everyday caps for sun, sport and casual outfits, from classic baseball shapes to snapbacks and seasonal styles. Check each product page for colours, sizing and fabric details before you order.",
    bn: "একটি ভালো ক্যাপের আসল বিষয় হলো ফিট, কাপড় এবং আপনি কত নিয়মিত সেটি পরবেন। এই কালেকশনে রোদ, খেলাধুলা ও সাধারণ পোশাকের জন্য প্রতিদিনের ক্যাপ রাখা হয়েছে, ক্লাসিক বেসবল থেকে স্ন্যাপব্যাক ও মৌসুমি স্টাইল পর্যন্ত। অর্ডারের আগে প্রতিটি পণ্যের পেজে রং, সাইজ ও কাপড়ের তথ্য দেখে নিন।",
  },
  tech: {
    en: "Tech accessories should make daily work and entertainment easier, not more complicated. This collection covers practical items such as headphones, speakers, keyboards, mice and digital watches. Each product page explains the key features and specifications, and you can message us before ordering if you want help choosing.",
    bn: "টেক অ্যাক্সেসরিজ দৈনন্দিন কাজ ও বিনোদন সহজ করার জন্য, জটিল করার জন্য নয়। এই কালেকশনে আছে হেডফোন, স্পিকার, কিবোর্ড, মাউস ও ডিজিটাল ঘড়ির মতো কাজের জিনিস। প্রতিটি পণ্যের পেজে মূল ফিচার ও স্পেসিফিকেশন দেওয়া আছে, আর বেছে নিতে সাহায্য চাইলে অর্ডারের আগে আমাদের মেসেজ করতে পারেন।",
  },
  jewelry: {
    en: "Jewellery is personal, so this collection keeps the choices clear: each piece has its own page with photos, materials and sizing where it applies. Whether it is a gift or something for yourself, take a close look at the details and ask us anything before you order.",
    bn: "গহনা একান্ত ব্যক্তিগত, তাই এই কালেকশনে পছন্দগুলো স্পষ্ট রাখা হয়েছে: প্রতিটি গহনার আলাদা পেজে ছবি, উপাদান এবং প্রযোজ্য ক্ষেত্রে সাইজ দেওয়া আছে। উপহার হোক বা নিজের জন্য, বিস্তারিত ভালো করে দেখে নিন এবং অর্ডারের আগে যেকোনো প্রশ্ন আমাদের করুন।",
  },
  general: {
    en: "This collection brings together useful products chosen for everyday life. Each item has its own page with photos, details and availability, so you can compare options and pick what suits you.",
    bn: "এই কালেকশনে দৈনন্দিন জীবনের জন্য বেছে নেওয়া কাজের পণ্যগুলো একসঙ্গে রাখা হয়েছে। প্রতিটি পণ্যের আলাদা পেজে ছবি, বিস্তারিত ও প্রাপ্যতা দেওয়া আছে, যাতে তুলনা করে নিজের পছন্দেরটি বেছে নিতে পারেন।",
  },
};

export function categoryGuide(preset: CollectionPreset, name: string, locale: Locale): Guide {
  const bn = locale === "bn";
  return {
    heading: bn ? `${name} কেনার আগে জেনে নিন` : `Buying ${name} from OANRO`,
    paragraphs: [
      bn ? presetCopy[preset].bn : presetCopy[preset].en,
      bn ? `OANRO অনলাইনে ${name} বিক্রি করে; বর্তমানে ডেলিভারি সারা বাংলাদেশে। পছন্দের পণ্যটি ব্যাগে যোগ করুন, চেকআউটে ঠিকানা দিন, আর ডেলিভারি ও পেমেন্টের অপশন সেখানেই দেখতে পাবেন। ডেলিভারির সময়, চার্জ ও রিটার্নের নিয়ম জানতে আমাদের ডেলিভারি ও রিটার্ন পেজ দেখুন। কোনো পণ্য নিয়ে প্রশ্ন থাকলে মেসেঞ্জার বা ইমেইলে যোগাযোগ করুন, আমরা সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।`
         : `OANRO sells ${name} online, with delivery currently available across Bangladesh. Add what you like to your bag, enter your address at checkout, and you will see the delivery and payment options there. For delivery times, charges and returns, see our Delivery & Returns page. If you have a question about any product, message us on Messenger or by email and we usually reply within one working day.`,
    ],
  };
}

export function serviceGuide(title: string, locale: Locale): Guide {
  const bn = locale === "bn";
  return bn ? {
    heading: `OANRO-র সঙ্গে ${title} কীভাবে কাজ করে`,
    paragraphs: [
      "প্রতিটি প্রজেক্ট শুরু হয় একটি ছোট আলোচনা দিয়ে: আপনার ব্যবসা কী করে, কারা আপনার গ্রাহক, আর আপনি কী অর্জন করতে চান। এরপর আমরা একটি পরিষ্কার পরিকল্পনা দিই, যেখানে কাজের পরিধি, ধাপ ও সময় লেখা থাকে, যাতে শুরু করার আগেই সব বুঝে নিতে পারেন।",
      "আমরা বাংলাদেশ ও বিশ্বের যেকোনো জায়গার ছোট ও নতুন ব্যবসার সঙ্গে কাজ করি, এবং বাংলা ও ইংরেজি দুই ভাষাতেই যোগাযোগ করি। আপনার প্রয়োজন জানাতে মেসেজ বা ইনকোয়ারি পাঠান, আমরা সাধারণত এক কর্মদিবসের মধ্যে উত্তর দিই।",
    ],
  } : {
    heading: `How ${title} works with OANRO`,
    paragraphs: [
      "Every project starts with a short conversation about what your business does, who your customers are and what you want to achieve. We then give you a clear plan with the scope, the steps and the timeline written down, so you know exactly what you are getting before any work begins.",
      "We work with small and growing businesses in Bangladesh and around the world, and communicate in both Bangla and English. Send a message or an inquiry describing what you need, and we usually reply within one working day.",
    ],
  };
}
