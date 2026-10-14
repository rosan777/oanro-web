import { bigint, boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
