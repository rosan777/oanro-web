// Permission catalog and role templates. Pure data, shared by server checks and the staff UI.
export const permissions = ["products.manage", "products.draft", "products.publish", "products.hide", "sections.toggle", "services.manage", "campaigns.manage", "pulse.manage", "site.manage", "leads.read", "leads.manage", "orders.read", "orders.manage", "staff.manage", "audit.read", "reports.read", "profit.read", "costs.manage", "cod.manage", "account.security", "customers.read", "customers.delete",
  "content.manage", "banners.manage", "discounts.manage", "orders.labels", "customers.notes", "newsletter.read", "data.export"] as const;
export type Permission = typeof permissions[number];
export const permissionInfo: Record<Permission, { label: string; detail: string }> = {
  "products.manage": { label: "Products & sections (full)", detail: "Write, publish and hide products, edit live products, stock, archive, and create or edit sections. Does not include the section on/off switch." },
  "products.draft": { label: "Products: write drafts", detail: "Add new products and edit products that are still drafts. Cannot edit live or hidden products." },
  "products.publish": { label: "Products: publish", detail: "Make draft or hidden products live on the website." },
  "products.hide": { label: "Products: hide", detail: "Take live products off the website (hidden)." },
  "sections.toggle": { label: "Section on/off switch", detail: "Turn product sections on or off on the website. Only people with this permission see the switch." },
  "services.manage": { label: "Services", detail: "Add, edit and hide technology services." },
  "campaigns.manage": { label: "Seasonal campaigns", detail: "Create campaigns, schedule them and attach products." },
  "pulse.manage": { label: "Global Pulse", detail: "Publish and edit news stories." },
  "site.manage": { label: "Site switches", detail: "Turn Services and Global Pulse on or off." },
  "leads.read": { label: "View inquiries", detail: "See customer inquiries, including names and phone numbers." },
  "leads.manage": { label: "Handle inquiries", detail: "Change inquiry status, assign them and add notes." },
  "orders.read": { label: "View orders", detail: "See orders, customer names, phone numbers, addresses and payment details." },
  "orders.manage": { label: "Approve payments", detail: "Approve or reject orders after checking the bKash/Nagad account. Approving confirms money was received." },
  "staff.manage": { label: "Staff & roles", detail: "Invite staff, change roles, deactivate accounts. Give only to people you fully trust." },
  "audit.read": { label: "Activity log", detail: "View the record of who changed what." },
  "reports.read": { label: "Sales & stock report", detail: "See units sold, reserved and left, revenue per product, restock alerts and service inquiry counts. No costs or profit." },
  "profit.read": { label: "Profit analytics", detail: "See costs, courier charges, profit and margin per product with charts. Business-sensitive." },
  "account.security": { label: "Security settings", detail: "See the Security card on My account: turn on two-step verification and sign out other devices. Customers never see it." },
  "cod.manage": { label: "Cash on delivery", detail: "See and handle cash-on-delivery orders, and confirm when the courier hands over the cash." },
  "customers.read": { label: "View customers", detail: "See the customer list: names, emails, phone, addresses, orders and total spent. Personal data." },
  "customers.delete": { label: "Delete customer accounts", detail: "Permanently delete a customer's account. Their personal details are erased; orders stay (anonymized) for the accounts." },
  "costs.manage": { label: "Cost prices", detail: "See and change what each product costs you, and courier charges. Business-sensitive." },
  "content.manage": { label: "Website text & sections", detail: "Edit homepage, About, Studio and footer texts (English and Bangla), Guides, Studio packages and FAQ, and switch homepage sections on or off." },
  "banners.manage": { label: "Announcement bar", detail: "Add, edit, schedule and remove the messages in the bar at the top of the website." },
  "discounts.manage": { label: "Discount codes", detail: "Create discount codes, set limits and dates, and turn them on or off. See how often each was used." },
  "orders.labels": { label: "Order labels", detail: "Add team labels to orders (e.g. Call first, Gift wrap). Needs order access to see the orders." },
  "customers.notes": { label: "Customer notes", detail: "Write private team notes on customer pages. Needs customer access to see customers." },
  "newsletter.read": { label: "Newsletter list", detail: "See and export the newsletter subscribers (email addresses). Personal data." },
  "data.export": { label: "Export to Excel/CSV", detail: "Download orders and customers as spreadsheet files. Exports are logged. Personal data." },
};
export type RoleTemplate = { id: string; name: string; description: string; permissions: Permission[] };
/** Narrow product rights added later: never in built-in roles (Manager already has the full one); the owner adds them to custom roles. */
const narrowProductPermissions: Permission[] = ["products.draft", "products.publish", "products.hide", "sections.toggle"];
/** Business-sensitive permissions: never part of a built-in role; the owner grants them one by one. */
export const sensitivePermissions: Permission[] = ["data.export", "newsletter.read", "staff.manage", "reports.read", "profit.read", "costs.manage", "cod.manage", "account.security", "customers.read", "customers.delete"];
// Seeded by migrations 0005 and 0006 (keep in sync). The system owner always has every permission and is not a role.
export const roleTemplates: RoleTemplate[] = [
  { id: "manager", name: "Manager", description: "Runs the store day to day. Everything except staff management.", permissions: permissions.filter(p => !sensitivePermissions.includes(p) && !narrowProductPermissions.includes(p)) },
  { id: "catalog-editor", name: "Catalog editor", description: "Products, sections and seasonal campaigns.", permissions: ["products.manage", "campaigns.manage"] },
  { id: "content-editor", name: "Content editor", description: "Website text, services, Global Pulse, announcement bar and site switches.", permissions: ["content.manage", "banners.manage", "services.manage", "pulse.manage", "site.manage"] },
  { id: "sales", name: "Sales", description: "Answers customer inquiries and sees orders (cannot approve payments).", permissions: ["leads.read", "leads.manage", "orders.read"] },
  { id: "viewer", name: "Viewer", description: "Read-only: inquiries, orders and the activity log.", permissions: ["leads.read", "orders.read", "audit.read"] },
];

/** Product permissions: the full one implies the narrow ones. */
export function canProduct(has: (p: Permission) => boolean, what: "draft" | "publish" | "hide" | "toggle" | "manage") {
  // The section ON/OFF switch is its own permission: full product rights do NOT include it.
  if (what === "toggle") return has("sections.toggle");
  if (has("products.manage")) return true;
  return what === "manage" ? false : has(`products.${what}` as Permission);
}
export const productPermissions: Permission[] = ["products.manage", "products.draft", "products.publish", "products.hide", "sections.toggle"];

/** How permissions are grouped on the Staff & roles page (same areas as the admin menu). */
export const permissionGroups: { label: string; items: Permission[] }[] = [
  { label: "Daily work", items: ["orders.read", "orders.manage", "cod.manage", "orders.labels", "leads.read", "leads.manage", "customers.read", "customers.notes", "customers.delete"] },
  { label: "Store", items: ["products.manage", "products.draft", "products.publish", "products.hide", "sections.toggle", "costs.manage", "services.manage", "campaigns.manage", "discounts.manage"] },
  { label: "Website", items: ["content.manage", "banners.manage", "pulse.manage", "site.manage"] },
  { label: "Insights & data", items: ["reports.read", "profit.read", "audit.read", "newsletter.read", "data.export"] },
  { label: "Settings & security", items: ["staff.manage", "account.security"] },
];
