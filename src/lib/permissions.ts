// Permission catalog and role templates. Pure data, shared by server checks and the staff UI.
export const permissions = ["products.manage", "services.manage", "campaigns.manage", "pulse.manage", "site.manage", "leads.read", "leads.manage", "staff.manage", "audit.read"] as const;
export type Permission = typeof permissions[number];
export const permissionInfo: Record<Permission, { label: string; detail: string }> = {
  "products.manage": { label: "Products & sections", detail: "Add, edit, publish and archive products; manage product sections and their on/off switches." },
  "services.manage": { label: "Services", detail: "Add, edit and hide technology services." },
  "campaigns.manage": { label: "Seasonal campaigns", detail: "Create campaigns, schedule them and attach products." },
  "pulse.manage": { label: "Global Pulse", detail: "Publish and edit news stories." },
  "site.manage": { label: "Site switches", detail: "Turn Services and Global Pulse on or off." },
  "leads.read": { label: "View inquiries", detail: "See customer inquiries, including names and phone numbers." },
  "leads.manage": { label: "Handle inquiries", detail: "Change inquiry status, assign them and add notes." },
  "staff.manage": { label: "Staff & roles", detail: "Invite staff, change roles, deactivate accounts. Give only to people you fully trust." },
  "audit.read": { label: "Activity log", detail: "View the record of who changed what." },
};
export type RoleTemplate = { id: string; name: string; description: string; permissions: Permission[] };
// Seeded by migration 0005 (keep in sync). The system owner always has every permission and is not a role.
export const roleTemplates: RoleTemplate[] = [
  { id: "manager", name: "Manager", description: "Runs the store day to day. Everything except staff management.", permissions: permissions.filter(p => p !== "staff.manage") },
  { id: "catalog-editor", name: "Catalog editor", description: "Products, sections and seasonal campaigns.", permissions: ["products.manage", "campaigns.manage"] },
  { id: "content-editor", name: "Content editor", description: "Services, Global Pulse and site switches.", permissions: ["services.manage", "pulse.manage", "site.manage"] },
  { id: "sales", name: "Sales", description: "Answers customer inquiries.", permissions: ["leads.read", "leads.manage"] },
  { id: "viewer", name: "Viewer", description: "Read-only: inquiries and the activity log.", permissions: ["leads.read", "audit.read"] },
];
