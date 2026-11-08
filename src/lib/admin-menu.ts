// Admin side menu. Pure data: each link shows only to people with one of its permissions.
import { productPermissions, type Permission } from "./permissions";

export type MenuItem = { href: string; label: string; count?: number };
/** label is in the page language; key is the English group name (used for styling hooks). */
export type MenuGroup = { label: string; key: string; items: MenuItem[] };
export type AdminCounts = { orders: number; leads: number; lowStock: number };
type Access = { owner: boolean; permissions: Set<Permission> };
type Entry = MenuItem & { need?: Permission[]; ownerOnly?: boolean };

/** The menu groups and links this person may see, with badge counts; empty groups are left out. */
export function menuFor(
  access: Access,
  counts: AdminCounts,
  locale: "en" | "bn" = "en",
): MenuGroup[] {
  const say = (en: string) => (locale === "bn" ? (bangla[en] ?? en) : en);
  const groups: { label: string; items: Entry[] }[] = [
    {
      label: "Daily work",
      items: [
        { href: "/admin", label: "Today", count: counts.orders + counts.leads + counts.lowStock },
        { href: "/admin/orders", label: "Orders", count: counts.orders, need: ["orders.read"] },
        { href: "/admin/leads", label: "Inquiries", count: counts.leads, need: ["leads.read"] },
        { href: "/admin/customers", label: "Customers", need: ["customers.read"] },
        {
          href: "/admin/projects",
          label: "Client projects",
          need: ["projects.read", "projects.manage", "projects.invoices"],
        },
      ],
    },
    {
      label: "Store",
      items: [
        {
          href: "/admin/sections",
          label: "Products & sections",
          need: [...productPermissions, "services.manage", "pulse.manage", "site.manage"],
        },
        { href: "/admin/published", label: "Published products", need: [...productPermissions] },
        { href: "/admin/services", label: "Services", need: ["services.manage", "site.manage"] },
        { href: "/admin/campaigns", label: "Campaigns", need: ["campaigns.manage"] },
        { href: "/admin/discounts", label: "Discount codes", need: ["discounts.manage"] },
        { href: "/admin/pulse", label: "Global Pulse", need: ["pulse.manage", "site.manage"] },
      ],
    },
    {
      label: "Website",
      items: [
        {
          href: "/admin/assistant",
          label: "JUNO bot · On / Off",
          need: ["assistant.view", "assistant.edit"],
        },
        { href: "/admin/content", label: "Website content", need: ["content.manage"] },
        { href: "/admin/company-profile", label: "Company profile", need: ["content.manage"] },
        { href: "/admin/case-studies", label: "Case studies", need: ["content.manage"] },
        { href: "/admin/banners", label: "Announcement bar", need: ["banners.manage"] },
        { href: "/admin/newsletter", label: "Newsletter subscribers", need: ["newsletter.read"] },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/admin/reports/sales", label: "Sales & stock", need: ["reports.read"] },
        { href: "/admin/reports/profit", label: "Profit", need: ["profit.read"] },
        { href: "/admin/search", label: "Search insights", need: ["reports.read"] },
        { href: "/admin/activity", label: "Activity log", need: ["audit.read"] },
      ],
    },
    {
      label: "Settings",
      items: [
        { href: "/admin/settings", label: "Payment & delivery", ownerOnly: true },
        { href: "/admin/staff", label: "Staff & roles", need: ["staff.manage"] },
      ],
    },
  ];
  const allowed = (e: Entry) =>
    access.owner || (!e.ownerOnly && (!e.need || e.need.some(p => access.permissions.has(p))));
  return groups
    .map(g => ({
      label: say(g.label),
      key: g.label,
      items: g.items.filter(allowed).map(({ href, label, count }) => ({
        href,
        label: say(label),
        ...(count ? { count } : {}),
      })),
    }))
    .filter(g => g.items.length > 0);
}

/** Bangla names for the admin menu (the English text is the key). */
const bangla: Record<string, string> = {
  "Daily work": "প্রতিদিনের কাজ",
  Today: "আজ",
  Orders: "অর্ডার",
  Inquiries: "ইনকোয়ারি",
  Customers: "গ্রাহক",
  "Client projects": "ক্লায়েন্ট প্রজেক্ট",
  Store: "স্টোর",
  "Products & sections": "পণ্য ও সেকশন",
  "Published products": "প্রকাশিত পণ্য",
  Services: "সেবা",
  Campaigns: "ক্যাম্পেইন",
  "Discount codes": "ডিসকাউন্ট কোড",
  "Global Pulse": "গ্লোবাল পালস",
  Website: "ওয়েবসাইট",
  "JUNO bot · On / Off": "JUNO বট · চালু / বন্ধ",
  "Website content": "ওয়েবসাইটের কনটেন্ট",
  "Company profile": "কোম্পানি প্রোফাইল",
  "Case studies": "কেস স্টাডি",
  "Announcement bar": "ঘোষণা বার",
  "Newsletter subscribers": "নিউজলেটার সাবস্ক্রাইবার",
  Insights: "ইনসাইট",
  "Sales & stock": "বিক্রি ও স্টক",
  Profit: "মুনাফা",
  "Search insights": "সার্চ ইনসাইট",
  "Activity log": "কার্যক্রমের লগ",
  Settings: "সেটিংস",
  "Payment & delivery": "পেমেন্ট ও ডেলিভারি",
  "Staff & roles": "স্টাফ ও রোল",
};
