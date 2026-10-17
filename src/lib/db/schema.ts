import { bigint, boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ProductStatus } from "../product-input";
import type { CollectionPreset } from "../categories";

const time = (name: string) => timestamp(name, { withTimezone: true });
export const user = pgTable("auth_user", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  email: text("email").notNull().unique(), emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"), createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
});
export const session = pgTable("auth_session", {
  id: text("id").primaryKey(), token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: time("expires_at").notNull(), createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"), userAgent: text("user_agent"),
}, t => [index("session_user_idx").on(t.userId)]);
export const account = pgTable("auth_account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(), providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"),
  accessTokenExpiresAt: time("access_token_expires_at"), refreshTokenExpiresAt: time("refresh_token_expires_at"),
  scope: text("scope"), password: text("password"), createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("account_provider_identity_idx").on(t.providerId, t.accountId), index("account_user_idx").on(t.userId)]);
export const verification = pgTable("auth_verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: time("expires_at").notNull(), createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [index("verification_identifier_idx").on(t.identifier)]);
export const rateLimit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(), key: text("key").notNull().unique(), count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
// System ownership is separate from future configurable role titles.
export const systemOwner = pgTable("system_owner", {
  slot: integer("slot").primaryKey().default(1),
  userId: text("user_id").notNull().unique().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(),
}, t => [check("single_owner_slot", sql`${t.slot} = 1`)]);
export const auditEvent = pgTable("audit_event", {
  id: text("id").primaryKey(), actorId: text("actor_id").references(() => user.id),
  action: text("action").notNull(), targetId: text("target_id").notNull(), reason: text("reason").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const websiteSection = pgTable("website_section", {
  code: text("code").primaryKey(), enabled: boolean("enabled").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  updatedBy: text("updated_by").notNull().references(() => user.id),
  updatedAt: time("updated_at").notNull().defaultNow(),
});
export const pulseStory = pgTable("pulse_story", {
  id: text("id").primaryKey(), publisher: text("publisher").notNull(), headline: text("headline").notNull(),
  url: text("url").notNull().unique(), thumbnailUrl: text("thumbnail_url"),
  publishedAt: time("published_at"), approvedAt: time("approved_at").notNull().defaultNow(),
  approvedBy: text("approved_by").notNull().references(() => user.id),
  rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
  visible: boolean("visible").notNull().default(false),
  createdAt: time("created_at").notNull().defaultNow(),
}, t => [index("pulse_story_visibility_idx").on(t.visible, t.approvedAt)]);
// Storefront rows ("sections") that group products. Seasonal, Caps and Tech are seeded; the owner can add more.
export const productCollection = pgTable("product_collection", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(),
  preset: text("preset").$type<CollectionPreset>().notNull().default("general"),
  status: text("status").$type<ProductStatus>().notNull().default("draft"),
  nameEn: text("name_en").notNull(), nameBn: text("name_bn").notNull().default(""),
  headlineEn: text("headline_en").notNull().default(""), headlineBn: text("headline_bn").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""), descriptionBn: text("description_bn").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: text("created_by").references(() => user.id), updatedBy: text("updated_by").references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
  archivedAt: time("archived_at"),
}, t => [
  check("product_collection_status_check", sql`${t.status} in ('draft', 'published', 'hidden')`),
  check("product_collection_preset_check", sql`${t.preset} in ('seasonal', 'caps', 'tech', 'general')`),
]);
// Owner-managed catalog. Rows are archived (soft-deleted) so audit history and links stay valid.
export const product = pgTable("product", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(),
  status: text("status").$type<ProductStatus>().notNull().default("draft"),
  collectionId: text("collection_id").notNull().default("seasonal").references(() => productCollection.id),
  nameEn: text("name_en").notNull(), nameBn: text("name_bn").notNull().default(""),
  categoryEn: text("category_en").notNull().default(""), categoryBn: text("category_bn").notNull().default(""),
  taglineEn: text("tagline_en").notNull().default(""), taglineBn: text("tagline_bn").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""), descriptionBn: text("description_bn").notNull().default(""),
  price: integer("price").notNull(), stock: integer("stock"),
  sizes: jsonb("sizes").$type<string[]>().notNull(),
  specsEn: jsonb("specs_en").$type<[string, string][]>().notNull(),
  specsBn: jsonb("specs_bn").$type<[string, string][]>().notNull(),
  imageData: text("image_data"), imagePosition: text("image_position").notNull().default("50% 50%"),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => user.id),
  updatedBy: text("updated_by").notNull().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
  archivedAt: time("archived_at"),
}, t => [
  index("product_storefront_idx").on(t.status, t.displayOrder),
  check("product_status_check", sql`${t.status} in ('draft', 'published', 'hidden')`),
  check("product_price_check", sql`${t.price} >= 0`),
  check("product_stock_check", sql`${t.stock} is null or ${t.stock} >= 0`),
]);
// Technology services ("Tech solutions") shown on the storefront.
export const service = pgTable("service", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(),
  status: text("status").$type<ProductStatus>().notNull().default("draft"),
  titleEn: text("title_en").notNull(), titleBn: text("title_bn").notNull().default(""),
  word: text("word").notNull().default(""),
  categoryEn: text("category_en").notNull().default(""), categoryBn: text("category_bn").notNull().default(""),
  summaryEn: text("summary_en").notNull().default(""), summaryBn: text("summary_bn").notNull().default(""),
  detailEn: text("detail_en").notNull().default(""), detailBn: text("detail_bn").notNull().default(""),
  imageData: text("image_data"), displayOrder: integer("display_order").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => user.id), updatedBy: text("updated_by").notNull().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
  archivedAt: time("archived_at"),
}, t => [
  index("service_storefront_idx").on(t.status, t.displayOrder),
  check("service_status_check", sql`${t.status} in ('draft', 'published', 'hidden')`),
]);

// ---- Staff roles and permissions (RBAC). Deny by default; the system owner bypasses roles.
export const role = pgTable("role", {
  id: text("id").primaryKey(), name: text("name").notNull(), description: text("description").notNull().default(""),
  departmentId: text("department_id"), // seam for future departments/hierarchy
  builtIn: boolean("built_in").notNull().default(false),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
});
export const rolePermission = pgTable("role_permission", {
  roleId: text("role_id").notNull().references(() => role.id, { onDelete: "cascade" }), permission: text("permission").notNull(),
}, t => [primaryKey({ columns: [t.roleId, t.permission] })]);
export const staffMember = pgTable("staff_member", {
  userId: text("user_id").primaryKey().references(() => user.id),
  roleId: text("role_id").notNull().references(() => role.id),
  status: text("status").$type<"active" | "deactivated">().notNull().default("active"),
  managerId: text("manager_id").references(() => user.id), // seam for future reporting lines
  invitedBy: text("invited_by").references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(), deactivatedAt: time("deactivated_at"),
}, t => [check("staff_member_status_check", sql`${t.status} in ('active', 'deactivated')`)]);
export const staffInvite = pgTable("staff_invite", {
  id: text("id").primaryKey(), email: text("email").notNull(), roleId: text("role_id").notNull().references(() => role.id),
  invitedBy: text("invited_by").notNull().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), expiresAt: time("expires_at").notNull(),
  acceptedAt: time("accepted_at"), acceptedBy: text("accepted_by").references(() => user.id), revokedAt: time("revoked_at"),
}, t => [index("staff_invite_email_idx").on(t.email)]);

// ---- Seasonal campaigns: a scheduled banner plus a hand-picked set of products.
export const campaign = pgTable("campaign", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(),
  status: text("status").$type<ProductStatus>().notNull().default("draft"),
  nameEn: text("name_en").notNull(), nameBn: text("name_bn").notNull().default(""),
  headlineEn: text("headline_en").notNull().default(""), headlineBn: text("headline_bn").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""), descriptionBn: text("description_bn").notNull().default(""),
  imageData: text("image_data"), startsAt: time("starts_at"), endsAt: time("ends_at"),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => user.id), updatedBy: text("updated_by").notNull().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(), archivedAt: time("archived_at"),
}, t => [
  check("campaign_status_check", sql`${t.status} in ('draft', 'published', 'hidden')`),
  check("campaign_window_check", sql`${t.startsAt} is null or ${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`),
]);
export const campaignProduct = pgTable("campaign_product", {
  campaignId: text("campaign_id").notNull().references(() => campaign.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => product.id),
  pinned: boolean("pinned").notNull().default(false), displayOrder: integer("display_order").notNull().default(0),
  addedBy: text("added_by").notNull().references(() => user.id), addedAt: time("added_at").notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.campaignId, t.productId] })]);

// ---- Customer inquiries (leads). Stores only what the customer typed plus a salted IP hash for rate limiting.
export const leadKinds = ["product", "restock", "service", "general", "privacy"] as const;
export const leadStatuses = ["new", "contacted", "qualified", "won", "lost", "closed"] as const;
export const lead = pgTable("lead", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<typeof leadKinds[number]>().notNull(),
  status: text("status").$type<typeof leadStatuses[number]>().notNull().default("new"),
  productSlug: text("product_slug"), serviceSlug: text("service_slug"), subject: text("subject").notNull().default(""),
  size: text("size"), quantity: integer("quantity"),
  name: text("name").notNull(), phone: text("phone").notNull().default(""), email: text("email").notNull().default(""),
  message: text("message").notNull().default(""), preferredContact: text("preferred_contact").notNull().default("phone"),
  locale: text("locale").notNull().default("en"), consentAt: time("consent_at").notNull(), ipHash: text("ip_hash"),
  assignedTo: text("assigned_to").references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [
  index("lead_status_idx").on(t.status, t.createdAt), index("lead_ip_idx").on(t.ipHash, t.createdAt),
  check("lead_kind_check", sql`${t.kind} in ('product', 'restock', 'service', 'general', 'privacy')`),
  check("lead_status_check", sql`${t.status} in ('new', 'contacted', 'qualified', 'won', 'lost', 'closed')`),
  check("lead_quantity_check", sql`${t.quantity} is null or (${t.quantity} between 1 and 100)`),
]);
export const leadNote = pgTable("lead_note", {
  id: text("id").primaryKey(), leadId: text("lead_id").notNull().references(() => lead.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => user.id), body: text("body").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
}, t => [index("lead_note_lead_idx").on(t.leadId, t.createdAt)]);
