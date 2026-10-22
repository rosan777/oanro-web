// Editorial content for the About page, Guides, Studio packages and service FAQs (English + Bangla).
// Plain data so pages, the sitemap and structured data share one source. No prices or claims we can't stand behind.
export type Bi = { en: string; bn: string };
export type Guide = { slug: string; title: Bi; summary: Bi; updated: string; sections: { heading: Bi; body: Bi }[] };

export const guides: Guide[] = [
  { slug: "winter-clothing-care", updated: "2026-10-22",
    title: { en: "How to care for winter knitwear", bn: "শীতের উলের পোশাকের যত্ন কীভাবে নেবেন" },
    summary: { en: "Washing, drying and storing sweaters and caps so they stay soft and keep their shape for years.", bn: "সোয়েটার ও টুপি কীভাবে ধোবেন, শুকাবেন ও রাখবেন, যাতে বছরের পর বছর নরম ও আকারে থাকে।" },
    sections: [
      { heading: { en: "Wash less, and gently", bn: "কম ধুন, আলতো করে ধুন" }, body: { en: "Knitwear rarely needs washing after every wear — airing it overnight is often enough. When it does need a wash, turn it inside out and use cold water with a mild detergent, by hand or on a wool cycle.", bn: "উলের পোশাক প্রতিবার পরার পর ধোয়ার দরকার হয় না — রাতভর বাতাসে রাখলেই অনেক সময় যথেষ্ট। ধুতে হলে উল্টো করে ঠান্ডা পানি আর হালকা ডিটারজেন্টে হাতে বা উলের সাইকেলে ধুন।" } },
      { heading: { en: "Dry flat, never hang", bn: "সমান করে শুকান, ঝোলাবেন না" }, body: { en: "Press out water by rolling the piece in a towel — don't wring it. Lay it flat on a dry towel away from direct sun. Hanging a wet sweater stretches the shoulders and length.", bn: "তোয়ালেতে পেঁচিয়ে চেপে পানি বের করুন — মোচড়াবেন না। সরাসরি রোদ থেকে দূরে শুকনো তোয়ালের ওপর সমান করে রাখুন। ভেজা সোয়েটার ঝোলালে কাঁধ ও লম্বা টেনে যায়।" } },
      { heading: { en: "Pilling is normal", bn: "রোঁয়া ওঠা স্বাভাবিক" }, body: { en: "Small fibre balls appear where knitwear rubs (under the arms, sides). Remove them gently with a fabric shaver or a sweater comb.", bn: "যেখানে ঘষা লাগে (বাহুর নিচে, পাশে) সেখানে ছোট রোঁয়া ওঠে। ফেব্রিক শেভার বা সোয়েটার চিরুনি দিয়ে আলতো করে তুলে ফেলুন।" } },
      { heading: { en: "Store folded, clean and dry", bn: "পরিষ্কার, শুকনো ও ভাঁজ করে রাখুন" }, body: { en: "At the end of winter, wash or air everything first, fold it, and keep it in a breathable bag with a few neem leaves or cedar to keep insects away. Avoid plastic for long storage — trapped humidity causes smells.", bn: "শীত শেষে আগে ধুয়ে বা বাতাসে রেখে ভাঁজ করুন, পোকা দূরে রাখতে কয়েকটা নিমপাতা দিয়ে বাতাস চলাচল করে এমন ব্যাগে রাখুন। দীর্ঘদিন প্লাস্টিকে রাখবেন না — আর্দ্রতায় গন্ধ হয়।" } },
    ] },
  { slug: "choose-the-right-size", updated: "2026-10-22",
    title: { en: "Choosing the right size online", bn: "অনলাইনে সঠিক সাইজ বেছে নেওয়া" },
    summary: { en: "A simple way to measure yourself and compare with any size chart before you order.", bn: "অর্ডারের আগে নিজের মাপ নিয়ে যেকোনো সাইজ চার্টের সাথে মেলানোর সহজ উপায়।" },
    sections: [
      { heading: { en: "Measure a piece you already love", bn: "পছন্দের একটা পোশাক মাপুন" }, body: { en: "Lay a sweater or shirt that fits you well flat on a table. Measure across the chest from armpit to armpit and double it, then measure the length from the top of the shoulder to the hem.", bn: "ভালোভাবে মানায় এমন একটা সোয়েটার বা শার্ট টেবিলে সমান করে রাখুন। এক বগল থেকে অন্য বগল পর্যন্ত বুকের মাপ নিয়ে দুই দিয়ে গুণ করুন, তারপর কাঁধের ওপর থেকে নিচের প্রান্ত পর্যন্ত লম্বা মাপুন।" } },
      { heading: { en: "Compare with the chart", bn: "চার্টের সাথে মেলান" }, body: { en: "Match your numbers to the size guide on the product page. If you're between two sizes, take the larger one for a relaxed fit or the smaller one for a closer fit.", bn: "আপনার মাপ পণ্যের পেজের সাইজ গাইডের সাথে মেলান। দুই সাইজের মাঝে হলে আরামদায়ক ফিটের জন্য বড়টি, আর গায়ের সাথে লেগে থাকা ফিটের জন্য ছোটটি নিন।" } },
      { heading: { en: "Caps and beanies", bn: "ক্যাপ ও বিনি" }, body: { en: "Measure around your head just above the ears and eyebrows. Most adults are between 54 and 60 cm; adjustable caps cover that whole range.", bn: "কান ও ভ্রুর একটু ওপর দিয়ে মাথার চারপাশ মাপুন। বেশিরভাগ বড়দের মাপ ৫৪ থেকে ৬০ সেমি; অ্যাডজাস্টেবল ক্যাপ পুরো এই মাপে হয়।" } },
      { heading: { en: "Still unsure? Ask us", bn: "এখনো নিশ্চিত নন? জিজ্ঞাসা করুন" }, body: { en: "Use “Ask about this product” on any product page — a real person replies with the exact measurements.", bn: "যেকোনো পণ্যের পেজে “জিজ্ঞাসা করুন” ব্যবহার করুন — আমাদের একজন মানুষ সঠিক মাপসহ উত্তর দেবেন।" } },
    ] },
  { slug: "before-you-build-a-website", updated: "2026-10-22",
    title: { en: "What to prepare before building a website", bn: "ওয়েবসাইট বানানোর আগে কী প্রস্তুত রাখবেন" },
    summary: { en: "Five things that make a website project faster, cheaper and closer to what you imagined.", bn: "পাঁচটি বিষয় যা ওয়েবসাইট প্রজেক্টকে দ্রুত, সাশ্রয়ী আর আপনার ভাবনার আরও কাছাকাছি করে।" },
    sections: [
      { heading: { en: "1. One clear goal", bn: "১. একটি স্পষ্ট লক্ষ্য" }, body: { en: "Decide the single most important thing visitors should do: order, call, book, or sign up. Every page is then built around that action.", bn: "ভিজিটররা সবচেয়ে গুরুত্বপূর্ণ কোন কাজটি করবে ঠিক করুন: অর্ডার, কল, বুকিং বা সাইন আপ। তারপর প্রতিটি পেজ সেই কাজকে ঘিরে বানানো হয়।" } },
      { heading: { en: "2. Your content", bn: "২. আপনার কনটেন্ট" }, body: { en: "Collect your logo, photos, product or service list, prices and contact details. Content is usually the slowest part of any project.", bn: "লোগো, ছবি, পণ্য বা সেবার তালিকা, দাম ও যোগাযোগের তথ্য জোগাড় করুন। যেকোনো প্রজেক্টে সাধারণত কনটেন্টই সবচেয়ে ধীর অংশ।" } },
      { heading: { en: "3. Sites you like", bn: "৩. পছন্দের সাইট" }, body: { en: "Note two or three websites you like and why — the colours, the layout, how easy they are on a phone. It saves many rounds of changes.", bn: "পছন্দের দুই-তিনটি ওয়েবসাইট আর কেন পছন্দ — রঙ, লেআউট, ফোনে কতটা সহজ — লিখে রাখুন। এতে অনেকবার পরিবর্তনের ঝামেলা কমে।" } },
      { heading: { en: "4. Payments and delivery", bn: "৪. পেমেন্ট ও ডেলিভারি" }, body: { en: "If you sell online, decide how customers pay (bKash, Nagad, cards, cash on delivery) and who delivers. These shape the checkout.", bn: "অনলাইনে বিক্রি করলে গ্রাহক কীভাবে পেমেন্ট করবেন (বিকাশ, নগদ, কার্ড, ক্যাশ অন ডেলিভারি) আর কে ডেলিভারি দেবে ঠিক করুন। এগুলো দিয়েই চেকআউট তৈরি হয়।" } },
      { heading: { en: "5. Who updates it", bn: "৫. কে আপডেট করবেন" }, body: { en: "Decide who will add products, change prices and answer messages after launch, so the admin panel is built for them.", bn: "লঞ্চের পর কে পণ্য যোগ করবেন, দাম বদলাবেন আর বার্তার উত্তর দেবেন ঠিক করুন, যাতে অ্যাডমিন প্যানেল তাঁর জন্যই বানানো হয়।" } },
    ] },
];

export const studioPackages: { name: Bi; for: Bi; includes: Bi[] }[] = [
  { name: { en: "Starter website", bn: "স্টার্টার ওয়েবসাইট" }, for: { en: "Shops, professionals and small teams", bn: "দোকান, পেশাজীবী ও ছোট টিম" },
    includes: [{ en: "Up to 5 pages, English + Bangla", bn: "৫টি পর্যন্ত পেজ, ইংরেজি + বাংলা" }, { en: "Mobile-first design", bn: "মোবাইল-প্রথম ডিজাইন" }, { en: "Contact form and WhatsApp button", bn: "যোগাযোগ ফর্ম ও WhatsApp বাটন" }, { en: "Google-ready SEO setup", bn: "গুগলের জন্য SEO সেটআপ" }] },
  { name: { en: "Online store", bn: "অনলাইন স্টোর" }, for: { en: "Brands selling products online", bn: "অনলাইনে পণ্য বিক্রি করা ব্র্যান্ড" },
    includes: [{ en: "Products, bag and checkout", bn: "পণ্য, ব্যাগ ও চেকআউট" }, { en: "bKash, Nagad and cash on delivery", bn: "বিকাশ, নগদ ও ক্যাশ অন ডেলিভারি" }, { en: "Admin panel with staff roles", bn: "স্টাফ রোলসহ অ্যাডমিন প্যানেল" }, { en: "Order emails and tracking", bn: "অর্ডার ইমেইল ও ট্র্যাকিং" }] },
  { name: { en: "Custom software & apps", bn: "কাস্টম সফটওয়্যার ও অ্যাপ" }, for: { en: "Businesses with their own workflow", bn: "নিজস্ব কাজের ধারা আছে এমন ব্যবসা" },
    includes: [{ en: "Web or mobile app built to your process", bn: "আপনার প্রক্রিয়া অনুযায়ী ওয়েব বা মোবাইল অ্যাপ" }, { en: "ERP, CRM, dashboards and integrations", bn: "ERP, CRM, ড্যাশবোর্ড ও ইন্টিগ্রেশন" }, { en: "Cloud hosting and security", bn: "ক্লাউড হোস্টিং ও নিরাপত্তা" }, { en: "Maintenance and support after launch", bn: "লঞ্চের পর মেইনটেন্যান্স ও সাপোর্ট" }] },
];

export const serviceFaq: { q: Bi; a: Bi }[] = [
  { q: { en: "How much does it cost?", bn: "খরচ কত?" }, a: { en: "Every project gets a fixed written quote after a free call, based on the pages and features you need. No hidden charges after we agree.", bn: "ফ্রি কলের পর আপনার দরকারি পেজ ও ফিচার অনুযায়ী প্রতিটি প্রজেক্টের জন্য লিখিত নির্দিষ্ট দাম দিই। রাজি হওয়ার পর কোনো লুকানো খরচ নেই।" } },
  { q: { en: "How long does it take?", bn: "কত সময় লাগে?" }, a: { en: "A starter website usually takes 1–2 weeks and an online store about 3–4 weeks, once we have your content. Custom software is planned step by step.", bn: "কনটেন্ট হাতে পেলে স্টার্টার ওয়েবসাইটে সাধারণত ১–২ সপ্তাহ আর অনলাইন স্টোরে প্রায় ৩–৪ সপ্তাহ লাগে। কাস্টম সফটওয়্যার ধাপে ধাপে পরিকল্পনা করা হয়।" } },
  { q: { en: "Can I see progress while you build?", bn: "বানানোর সময় অগ্রগতি দেখতে পারব?" }, a: { en: "Yes. You get a live preview link and an update every week, and you approve the design before we build features.", bn: "হ্যাঁ। একটি লাইভ প্রিভিউ লিংক আর প্রতি সপ্তাহে আপডেট পাবেন, আর ফিচার বানানোর আগে ডিজাইন আপনি অনুমোদন করবেন।" } },
  { q: { en: "Who owns the website and the domain?", bn: "ওয়েবসাইট ও ডোমেইনের মালিক কে?" }, a: { en: "You do. The site launches on your own domain, and you get the admin access and the source code agreed in the quote.", bn: "আপনি। সাইট আপনার নিজের ডোমেইনে লঞ্চ হয়, আর কোটে যা ঠিক হয় সেই অনুযায়ী অ্যাডমিন অ্যাক্সেস ও সোর্স কোড পাবেন।" } },
  { q: { en: "What happens after launch?", bn: "লঞ্চের পর কী হয়?" }, a: { en: "We stay available for fixes, updates and new features. Ongoing maintenance can be added as a monthly plan.", bn: "সমস্যা ঠিক, আপডেট আর নতুন ফিচারের জন্য আমরা পাশে থাকি। চাইলে মাসিক মেইনটেন্যান্স প্ল্যান নেওয়া যায়।" } },
];
