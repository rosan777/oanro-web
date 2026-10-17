CREATE TABLE "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"headline_en" text DEFAULT '' NOT NULL,
	"headline_bn" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_bn" text DEFAULT '' NOT NULL,
	"image_data" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "campaign_slug_unique" UNIQUE("slug"),
	CONSTRAINT "campaign_status_check" CHECK ("campaign"."status" in ('draft', 'published', 'hidden')),
	CONSTRAINT "campaign_window_check" CHECK ("campaign"."starts_at" is null or "campaign"."ends_at" is null or "campaign"."ends_at" > "campaign"."starts_at")
);

--> statement-breakpoint
CREATE TABLE "campaign_product" (
	"campaign_id" text NOT NULL,
	"product_id" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_product_campaign_id_product_id_pk" PRIMARY KEY("campaign_id","product_id")
);

--> statement-breakpoint
CREATE TABLE "lead" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"product_slug" text,
	"service_slug" text,
	"subject" text DEFAULT '' NOT NULL,
	"size" text,
	"quantity" integer,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"preferred_contact" text DEFAULT 'phone' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_kind_check" CHECK ("lead"."kind" in ('product', 'restock', 'service', 'general', 'privacy')),
	CONSTRAINT "lead_status_check" CHECK ("lead"."status" in ('new', 'contacted', 'qualified', 'won', 'lost', 'closed')),
	CONSTRAINT "lead_quantity_check" CHECK ("lead"."quantity" is null or ("lead"."quantity" between 1 and 100))
);

--> statement-breakpoint
CREATE TABLE "lead_note" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"department_id" text,
	"built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role_id" text NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);

--> statement-breakpoint
CREATE TABLE "staff_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role_id" text NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	"revoked_at" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "staff_member" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"manager_id" text,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "staff_member_status_check" CHECK ("staff_member"."status" in ('active', 'deactivated'))
);

--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_product" ADD CONSTRAINT "campaign_product_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_product" ADD CONSTRAINT "campaign_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_product" ADD CONSTRAINT "campaign_product_added_by_auth_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_to_auth_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_author_id_auth_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invite" ADD CONSTRAINT "staff_invite_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invite" ADD CONSTRAINT "staff_invite_invited_by_auth_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invite" ADD CONSTRAINT "staff_invite_accepted_by_auth_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_manager_id_auth_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_invited_by_auth_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "lead_status_idx" ON "lead" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "lead_ip_idx" ON "lead" USING btree ("ip_hash","created_at");
--> statement-breakpoint
CREATE INDEX "lead_note_lead_idx" ON "lead_note" USING btree ("lead_id","created_at");
--> statement-breakpoint
CREATE INDEX "staff_invite_email_idx" ON "staff_invite" USING btree ("email");
--> statement-breakpoint
-- Role templates (see src/lib/permissions.ts)
INSERT INTO "role" ("id", "name", "description", "built_in") VALUES ('manager', 'Manager', 'Runs the store day to day. Everything except staff management.', true), ('catalog-editor', 'Catalog editor', 'Products, sections and seasonal campaigns.', true), ('content-editor', 'Content editor', 'Services, Global Pulse and site switches.', true), ('sales', 'Sales', 'Answers customer inquiries.', true), ('viewer', 'Viewer', 'Read-only: inquiries and the activity log.', true);
--> statement-breakpoint
INSERT INTO "role_permission" ("role_id", "permission") VALUES ('manager', 'products.manage'), ('manager', 'services.manage'), ('manager', 'campaigns.manage'), ('manager', 'pulse.manage'), ('manager', 'site.manage'), ('manager', 'leads.read'), ('manager', 'leads.manage'), ('manager', 'audit.read'), ('catalog-editor', 'products.manage'), ('catalog-editor', 'campaigns.manage'), ('content-editor', 'services.manage'), ('content-editor', 'pulse.manage'), ('content-editor', 'site.manage'), ('sales', 'leads.read'), ('sales', 'leads.manage'), ('viewer', 'leads.read'), ('viewer', 'audit.read');