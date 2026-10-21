// Admin side menu. Pure data: each link shows only to people with one of its permissions.
import { productPermissions, type Permission } from "./permissions";

export type MenuItem = { href: string; label: string; count?: number };
export type MenuGroup = { label: string; items: MenuItem[] };
export type AdminCounts = { orders: number; leads: number; lowStock: number };
type Access = { owner: boolean; permissions: Set<Permission> };
type Entry = MenuItem & { need?: Permission[]; ownerOnly?: boolean };

export function menuFor(access: Access, counts: AdminCounts): MenuGroup[] {
  const groups: { label: string; items: Entry[] }[] = [
    { label: "Daily work", items: [
      { href: "/admin", label: "Today", count: counts.orders + counts.leads + counts.lowStock },
      { href: "/admin/orders", label: "Orders", count: counts.orders, need: ["orders.read"] },
      { href: "/admin/leads", label: "Inquiries", count: counts.leads, need: ["leads.read"] },
      { href: "/admin/customers", label: "Customers", need: ["customers.read"] },
    ] },
    { label: "Store", items: [
      { href: "/admin/sections", label: "Products & sections", need: [...productPermissions, "services.manage", "pulse.manage", "site.manage"] },
      { href: "/admin/services", label: "Services", need: ["services.manage", "site.manage"] },
      { href: "/admin/campaigns", label: "Campaigns", need: ["campaigns.manage"] },
      { href: "/admin/pulse", label: "Global Pulse", need: ["pulse.manage", "site.manage"] },
    ] },
    { label: "Insights", items: [
      { href: "/admin/reports/sales", label: "Sales & stock", need: ["reports.read"] },
      { href: "/admin/reports/profit", label: "Profit", need: ["profit.read"] },
      { href: "/admin/activity", label: "Activity log", need: ["audit.read"] },
    ] },
    { label: "Settings", items: [
      { href: "/admin/settings", label: "Payment & delivery", ownerOnly: true },
      { href: "/admin/staff", label: "Staff & roles", need: ["staff.manage"] },
    ] },
  ];
  const allowed = (e: Entry) => access.owner || (!e.ownerOnly && (!e.need || e.need.some(p => access.permissions.has(p))));
  return groups
    .map(g => ({ label: g.label, items: g.items.filter(allowed).map(({ href, label, count }) => ({ href, label, ...(count ? { count } : {}) })) }))
    .filter(g => g.items.length > 0);
}
