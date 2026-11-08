// Permission catalog and role templates. Pure data, shared by server checks and the staff UI.
export const permissions = [
  "products.manage",
  "products.draft",
  "products.publish",
  "products.hide",
  "sections.toggle",
  "services.manage",
  "campaigns.manage",
  "pulse.manage",
  "site.manage",
  "leads.read",
  "leads.manage",
  "orders.read",
  "orders.manage",
  "staff.manage",
  "audit.read",
  "reports.read",
  "profit.read",
  "costs.manage",
  "cod.manage",
  "account.security",
  "customers.read",
  "customers.delete",
  "content.manage",
  "banners.manage",
  "discounts.manage",
  "orders.labels",
  "customers.notes",
  "newsletter.read",
  "data.export",
  "assistant.view",
  "assistant.edit",
  "projects.read",
  "projects.manage",
  "projects.invoices",
] as const;
export type Permission = (typeof permissions)[number];

/** Name and explanation of each permission, shown on the Staff & roles page. */
export const permissionInfo: Record<Permission, { label: string; detail: string }> = {
  "products.manage": {
    label: "Products & sections (full)",
    detail:
      "Write, publish and hide products, edit live products, stock, archive, and create or edit sections. Does not include the section on/off switch.",
  },
  "products.draft": {
    label: "Products: write drafts",
    detail:
      "Add new products and edit products that are still drafts. Cannot edit live or hidden products.",
  },
  "products.publish": {
    label: "Products: publish",
    detail: "Make draft or hidden products live on the website.",
  },
  "products.hide": {
    label: "Products: hide",
    detail: "Take live products off the website (hidden).",
  },
  "sections.toggle": {
    label: "Section on/off switch",
    detail:
      "Turn product sections on or off on the website. Only people with this permission see the switch.",
  },
  "services.manage": { label: "Services", detail: "Add, edit and hide technology services." },
  "campaigns.manage": {
    label: "Seasonal campaigns",
    detail: "Create campaigns, schedule them and attach products.",
  },
  "pulse.manage": { label: "Global Pulse", detail: "Publish and edit news stories." },
  "site.manage": {
    label: "Site switches",
    detail: "Turn Services, Global Pulse and the back-to-top button on or off.",
  },
  "leads.read": {
    label: "View inquiries",
    detail: "See customer inquiries, including names and phone numbers.",
  },
  "leads.manage": {
    label: "Handle inquiries",
    detail: "Change inquiry status, assign them and add notes.",
  },
  "orders.read": {
    label: "View orders",
    detail: "See orders, customer names, phone numbers, addresses and payment details.",
  },
  "orders.manage": {
    label: "Approve payments",
    detail:
      "Approve or reject orders after checking the bKash/Nagad account. Approving confirms money was received.",
  },
  "staff.manage": {
    label: "Staff & roles",
    detail: "Invite staff, change roles, deactivate accounts. Give only to people you fully trust.",
  },
  "audit.read": { label: "Activity log", detail: "View the record of who changed what." },
  "reports.read": {
    label: "Sales & stock report",
    detail:
      "See units sold, reserved and left, revenue per product, restock alerts and service inquiry counts. No costs or profit.",
  },
  "profit.read": {
    label: "Profit analytics",
    detail:
      "See costs, courier charges, profit and margin per product with charts. Business-sensitive.",
  },
  "account.security": {
    label: "Security settings",
    detail:
      "See the Security card on My account: turn on two-step verification and sign out other devices. Customers never see it.",
  },
  "cod.manage": {
    label: "Cash on delivery",
    detail:
      "See and handle cash-on-delivery orders, and confirm when the courier hands over the cash.",
  },
  "customers.read": {
    label: "View customers",
    detail:
      "See the customer list: names, emails, phone, addresses, orders and total spent. Personal data.",
  },
  "customers.delete": {
    label: "Delete customer accounts",
    detail:
      "Permanently delete a customer's account. Their personal details are erased; orders stay (anonymized) for the accounts.",
  },
  "costs.manage": {
    label: "Cost prices",
    detail: "See and change what each product costs you, and courier charges. Business-sensitive.",
  },
  "content.manage": {
    label: "Website text & sections",
    detail:
      "Edit homepage, About, Studio and footer texts (English and Bangla), Guides, Studio packages and FAQ, and switch homepage sections on or off.",
  },
  "banners.manage": {
    label: "Announcement bar",
    detail: "Add, edit, schedule and remove the messages in the bar at the top of the website.",
  },
  "discounts.manage": {
    label: "Discount codes",
    detail:
      "Create discount codes, set limits and dates, and turn them on or off. See how often each was used.",
  },
  "orders.labels": {
    label: "Order labels",
    detail:
      "Add team labels to orders (e.g. Call first, Gift wrap). Needs order access to see the orders.",
  },
  "customers.notes": {
    label: "Customer notes",
    detail: "Write private team notes on customer pages. Needs customer access to see customers.",
  },
  "newsletter.read": {
    label: "Newsletter list",
    detail: "See and export the newsletter subscribers (email addresses). Personal data.",
  },
  "assistant.view": {
    label: "Assistant conversations",
    detail:
      "Read the shopping assistant's saved chats (sanitised, kept 30 days), unanswered questions and usage. Personal data may remain despite redaction.",
  },
  "assistant.edit": {
    label: "Assistant settings & knowledge",
    detail:
      "Turn the shopping assistant, voice and order tracking on or off, edit its answers (FAQ) and tone, and resolve unanswered questions.",
  },
  "projects.read": {
    label: "Client projects: view",
    detail:
      "See every client project in the Workspace: milestones, files, approvals, invoices and project activity. Read-only.",
  },
  "projects.manage": {
    label: "Client projects: manage",
    detail:
      "Create and edit projects and milestones, upload and share files, request approvals, invite or remove clients, and turn a won inquiry into a project (also needs View inquiries).",
  },
  "projects.invoices": {
    label: "Client projects: invoices",
    detail:
      "Create, issue and void project invoices, and confirm or reject a client's payment reference. Money: give only to people you trust.",
  },
  "data.export": {
    label: "Export to Excel/CSV",
    detail:
      "Download orders and customers as spreadsheet files. Exports are logged. Personal data.",
  },
};
export type RoleTemplate = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
};
/** Narrow product rights added later: never in built-in roles (Manager already has the full one); the owner adds them to custom roles. */
const narrowProductPermissions: Permission[] = [
  "products.draft",
  "products.publish",
  "products.hide",
  "sections.toggle",
];
/** Business-sensitive permissions: never part of a built-in role; the owner grants them one by one. */
export const sensitivePermissions: Permission[] = [
  // Client Workspace (approved 2026-11-05). Listed here so no existing role template gains them;
  // the owner grants them on the Staff & roles page.
  "projects.read",
  "projects.manage",
  "projects.invoices",
  "data.export",
  "newsletter.read",
  "assistant.view",
  "assistant.edit",
  "staff.manage",
  "reports.read",
  "profit.read",
  "costs.manage",
  "cod.manage",
  "account.security",
  "customers.read",
  "customers.delete",
];
// Seeded by migrations 0005 and 0006 (keep in sync). The system owner always has every permission and is not a role.
export const roleTemplates: RoleTemplate[] = [
  {
    id: "manager",
    name: "Manager",
    description: "Runs the store day to day. Everything except staff management.",
    permissions: permissions.filter(
      p => !sensitivePermissions.includes(p) && !narrowProductPermissions.includes(p),
    ),
  },
  {
    id: "catalog-editor",
    name: "Catalog editor",
    description: "Products, sections and seasonal campaigns.",
    permissions: ["products.manage", "campaigns.manage"],
  },
  {
    id: "content-editor",
    name: "Content editor",
    description: "Website text, services, Global Pulse, announcement bar and site switches.",
    permissions: [
      "content.manage",
      "banners.manage",
      "services.manage",
      "pulse.manage",
      "site.manage",
    ],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Answers customer inquiries and sees orders (cannot approve payments).",
    permissions: ["leads.read", "leads.manage", "orders.read"],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only: inquiries, orders and the activity log.",
    permissions: ["leads.read", "orders.read", "audit.read"],
  },
];

/** Product permissions: the full one implies the narrow ones. */
export function canProduct(
  has: (p: Permission) => boolean,
  what: "draft" | "publish" | "hide" | "toggle" | "manage",
) {
  // The section ON/OFF switch is its own permission: full product rights do NOT include it.
  if (what === "toggle") return has("sections.toggle");
  if (has("products.manage")) return true;
  return what === "manage" ? false : has(`products.${what}` as Permission);
}

/** The permissions that give some access to products or sections. */
export const productPermissions: Permission[] = [
  "products.manage",
  "products.draft",
  "products.publish",
  "products.hide",
  "sections.toggle",
];

/** How permissions are grouped on the Staff & roles page (same areas as the admin menu). */
export const permissionGroups: { label: string; items: Permission[] }[] = [
  {
    label: "Daily work",
    items: [
      "orders.read",
      "orders.manage",
      "cod.manage",
      "orders.labels",
      "leads.read",
      "leads.manage",
      "customers.read",
      "customers.notes",
      "customers.delete",
    ],
  },
  {
    label: "Store",
    items: [
      "products.manage",
      "products.draft",
      "products.publish",
      "products.hide",
      "sections.toggle",
      "costs.manage",
      "services.manage",
      "campaigns.manage",
      "discounts.manage",
    ],
  },
  { label: "Website", items: ["content.manage", "banners.manage", "pulse.manage", "site.manage"] },
  {
    label: "Insights & data",
    items: [
      "reports.read",
      "profit.read",
      "audit.read",
      "newsletter.read",
      "data.export",
      "assistant.view",
      "assistant.edit",
    ],
  },
  { label: "Settings & security", items: ["staff.manage", "account.security"] },
];

/** The same names and explanations in Bangla, for the Staff & roles page in /bn/admin (draft for owner review). */
export const permissionInfoBn: Record<Permission, { label: string; detail: string }> = {
  "products.manage": {
    label: "পণ্য ও সেকশন (সম্পূর্ণ)",
    detail:
      "পণ্য লেখা, প্রকাশ ও লুকানো, লাইভ পণ্য এডিট, স্টক, আর্কাইভ, আর সেকশন তৈরি বা এডিট। সেকশন চালু/বন্ধের সুইচ এতে নেই।",
  },
  "products.draft": {
    label: "পণ্য: খসড়া লেখা",
    detail: "নতুন পণ্য যোগ ও খসড়া অবস্থার পণ্য এডিট। লাইভ বা লুকানো পণ্য এডিট করা যায় না।",
  },
  "products.publish": {
    label: "পণ্য: প্রকাশ",
    detail: "খসড়া বা লুকানো পণ্য ওয়েবসাইটে লাইভ করা।",
  },
  "products.hide": { label: "পণ্য: লুকানো", detail: "লাইভ পণ্য ওয়েবসাইট থেকে সরানো (লুকানো)।" },
  "sections.toggle": {
    label: "সেকশন চালু/বন্ধ সুইচ",
    detail:
      "ওয়েবসাইটে পণ্যের সেকশন চালু বা বন্ধ করা। শুধু এই অনুমতি যাঁদের আছে তাঁরাই সুইচ দেখেন।",
  },
  "services.manage": { label: "সেবা", detail: "প্রযুক্তি সেবা যোগ, এডিট ও লুকানো।" },
  "campaigns.manage": {
    label: "মৌসুমি ক্যাম্পেইন",
    detail: "ক্যাম্পেইন তৈরি, সময় নির্ধারণ ও পণ্য যুক্ত করা।",
  },
  "pulse.manage": { label: "গ্লোবাল পালস", detail: "খবর প্রকাশ ও এডিট।" },
  "site.manage": {
    label: "সাইটের সুইচ",
    detail: "সেবা, গ্লোবাল পালস ও উপরে-ফেরার বাটন চালু বা বন্ধ করা।",
  },
  "leads.read": { label: "ইনকোয়ারি দেখা", detail: "গ্রাহকের ইনকোয়ারি দেখা, নাম ও ফোন নম্বরসহ।" },
  "leads.manage": {
    label: "ইনকোয়ারি সামলানো",
    detail: "ইনকোয়ারির অবস্থা বদলানো, দায়িত্ব দেওয়া ও নোট যোগ করা।",
  },
  "orders.read": {
    label: "অর্ডার দেখা",
    detail: "অর্ডার, গ্রাহকের নাম, ফোন, ঠিকানা ও পেমেন্টের তথ্য দেখা।",
  },
  "orders.manage": {
    label: "পেমেন্ট অনুমোদন",
    detail: "বিকাশ/নগদ অ্যাকাউন্ট দেখে অর্ডার অনুমোদন বা বাতিল। অনুমোদন মানে টাকা পাওয়া নিশ্চিত।",
  },
  "staff.manage": {
    label: "স্টাফ ও রোল",
    detail:
      "স্টাফ আমন্ত্রণ, রোল বদলানো, অ্যাকাউন্ট নিষ্ক্রিয় করা। শুধু পুরোপুরি বিশ্বস্ত মানুষকে দিন।",
  },
  "audit.read": { label: "কার্যক্রমের লগ", detail: "কে কী বদলেছেন তার রেকর্ড দেখা।" },
  "reports.read": {
    label: "বিক্রি ও স্টক রিপোর্ট",
    detail:
      "বিক্রি, সংরক্ষিত ও বাকি ইউনিট, পণ্যভিত্তিক আয়, স্টক সতর্কতা, সেবার ইনকোয়ারি ও সার্চ ইনসাইট দেখা। খরচ বা মুনাফা নয়।",
  },
  "profit.read": {
    label: "মুনাফার বিশ্লেষণ",
    detail: "চার্টসহ পণ্যভিত্তিক খরচ, কুরিয়ার চার্জ, মুনাফা ও মার্জিন দেখা। ব্যবসার গোপন তথ্য।",
  },
  "account.security": {
    label: "নিরাপত্তা সেটিংস",
    detail:
      "আমার অ্যাকাউন্টে নিরাপত্তা কার্ড দেখা: টু-স্টেপ যাচাই চালু ও অন্য ডিভাইস থেকে সাইন আউট। গ্রাহকরা কখনো দেখেন না।",
  },
  "cod.manage": {
    label: "ক্যাশ অন ডেলিভারি",
    detail: "ক্যাশ অন ডেলিভারি অর্ডার দেখা ও সামলানো, আর কুরিয়ার নগদ দিলে তা নিশ্চিত করা।",
  },
  "customers.read": {
    label: "গ্রাহক দেখা",
    detail: "গ্রাহকের তালিকা দেখা: নাম, ইমেইল, ফোন, ঠিকানা, অর্ডার ও মোট খরচ। ব্যক্তিগত তথ্য।",
  },
  "customers.delete": {
    label: "গ্রাহক অ্যাকাউন্ট মোছা",
    detail:
      "গ্রাহকের অ্যাকাউন্ট স্থায়ীভাবে মোছা। ব্যক্তিগত তথ্য মুছে যায়; হিসাবের জন্য অর্ডার (নামহীনভাবে) থাকে।",
  },
  "costs.manage": {
    label: "কেনা দাম",
    detail: "প্রতিটি পণ্যের খরচ ও কুরিয়ার চার্জ দেখা ও বদলানো। ব্যবসার গোপন তথ্য।",
  },
  "content.manage": {
    label: "ওয়েবসাইটের লেখা ও সেকশন",
    detail:
      "হোমপেজ, আমাদের কথা, স্টুডিও ও ফুটারের লেখা (ইংরেজি ও বাংলা), গাইড, স্টুডিও প্যাকেজ, সফটওয়্যার প্ল্যান, কেস স্টাডি ও FAQ এডিট, আর হোমপেজের সেকশন চালু বা বন্ধ করা।",
  },
  "banners.manage": {
    label: "ঘোষণা বার",
    detail: "ওয়েবসাইটের উপরের বারের বার্তা যোগ, এডিট, সময় নির্ধারণ ও সরানো।",
  },
  "discounts.manage": {
    label: "ডিসকাউন্ট কোড",
    detail:
      "ডিসকাউন্ট কোড তৈরি, সীমা ও তারিখ নির্ধারণ, চালু বা বন্ধ করা। কোনটি কতবার ব্যবহার হয়েছে দেখা।",
  },
  "orders.labels": {
    label: "অর্ডারের লেবেল",
    detail:
      "অর্ডারে টিমের লেবেল যোগ (যেমন আগে কল, গিফট র‍্যাপ)। অর্ডার দেখতে অর্ডারের অনুমতিও লাগে।",
  },
  "customers.notes": {
    label: "গ্রাহকের নোট",
    detail: "গ্রাহকের পেজে টিমের ব্যক্তিগত নোট লেখা। গ্রাহক দেখতে গ্রাহকের অনুমতিও লাগে।",
  },
  "newsletter.read": {
    label: "নিউজলেটারের তালিকা",
    detail: "নিউজলেটার সাবস্ক্রাইবার (ইমেইল ঠিকানা) দেখা ও এক্সপোর্ট। ব্যক্তিগত তথ্য।",
  },
  "assistant.view": {
    label: "অ্যাসিস্ট্যান্টের কথোপকথন",
    detail:
      "শপিং অ্যাসিস্ট্যান্টের সংরক্ষিত চ্যাট (পরিচ্ছন্ন, ৩০ দিন রাখা), উত্তরহীন প্রশ্ন ও ব্যবহার দেখা। পরিচ্ছন্ন করার পরও ব্যক্তিগত তথ্য থাকতে পারে।",
  },
  "assistant.edit": {
    label: "অ্যাসিস্ট্যান্টের সেটিংস ও জ্ঞান",
    detail:
      "শপিং অ্যাসিস্ট্যান্ট, ভয়েস ও অর্ডার ট্র্যাকিং চালু বা বন্ধ, উত্তর (FAQ) ও ভঙ্গি এডিট, আর উত্তরহীন প্রশ্নের সমাধান।",
  },
  "projects.read": {
    label: "ক্লায়েন্ট প্রজেক্ট: দেখা",
    detail:
      "ওয়ার্কস্পেসের সব ক্লায়েন্ট প্রজেক্ট দেখা: মাইলস্টোন, ফাইল, অনুমোদন, ইনভয়েস ও কার্যক্রম। শুধু দেখা।",
  },
  "projects.manage": {
    label: "ক্লায়েন্ট প্রজেক্ট: পরিচালনা",
    detail:
      "প্রজেক্ট ও মাইলস্টোন তৈরি ও এডিট, ফাইল আপলোড ও শেয়ার, অনুমোদন চাওয়া, ক্লায়েন্ট আমন্ত্রণ বা সরানো, আর সফল ইনকোয়ারিকে প্রজেক্টে রূপান্তর (ইনকোয়ারি দেখার অনুমতিও লাগে)।",
  },
  "projects.invoices": {
    label: "ক্লায়েন্ট প্রজেক্ট: ইনভয়েস",
    detail:
      "প্রজেক্টের ইনভয়েস তৈরি, পাঠানো ও বাতিল, আর ক্লায়েন্টের পেমেন্ট রেফারেন্স নিশ্চিত বা বাতিল। টাকার বিষয়: শুধু বিশ্বস্ত মানুষকে দিন।",
  },
  "data.export": {
    label: "Excel/CSV-এ এক্সপোর্ট",
    detail: "অর্ডার ও গ্রাহকের তথ্য স্প্রেডশিট ফাইলে ডাউনলোড। এক্সপোর্ট লগে থাকে। ব্যক্তিগত তথ্য।",
  },
};
