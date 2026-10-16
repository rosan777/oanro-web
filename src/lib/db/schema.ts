import { bigint, boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
