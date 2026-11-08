CREATE TABLE "case_study" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title_en" text NOT NULL,
	"title_bn" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"summary_bn" text DEFAULT '' NOT NULL,
	"problem_en" text DEFAULT '' NOT NULL,
	"problem_bn" text DEFAULT '' NOT NULL,
	"approach_en" text DEFAULT '' NOT NULL,
	"approach_bn" text DEFAULT '' NOT NULL,
	"outcome_en" text DEFAULT '' NOT NULL,
	"outcome_bn" text DEFAULT '' NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"client_consent" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_url" text DEFAULT '' NOT NULL,
	"image_data" text,
	"image_alt" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_slug_unique" UNIQUE("slug"),
	CONSTRAINT "case_study_status_check" CHECK ("case_study"."status" in ('draft', 'published', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "client_invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" text,
	"due_date" text,
	"total" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"payment_submitted_by" text,
	"payment_submitted_at" timestamp with time zone,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"void_reason" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_invoice_number_unique" UNIQUE("number"),
	CONSTRAINT "client_invoice_status_check" CHECK ("client_invoice"."status" in ('draft', 'issued', 'payment_submitted', 'paid', 'void')),
	CONSTRAINT "client_invoice_total_check" CHECK ("client_invoice"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "client_invoice_line" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "client_invoice_line_check" CHECK ("client_invoice_line"."quantity" between 1 and 10000 and "client_invoice_line"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "client_project" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"project_type" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"lead_id" text,
	"start_date" text,
	"target_date" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_project_status_check" CHECK ("client_project"."status" in ('planning', 'in_progress', 'in_review', 'completed', 'on_hold', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "client_project_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone_id" text,
	"file_id" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"client_comment" text DEFAULT '' NOT NULL,
	"requested_by" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_project_approval_status_check" CHECK ("client_project_approval"."status" in ('requested', 'approved', 'changes_requested'))
);
--> statement-breakpoint
CREATE TABLE "client_project_file" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"visibility" text DEFAULT 'shared' NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_project_file_visibility_check" CHECK ("client_project_file"."visibility" in ('shared', 'staff'))
);
--> statement-breakpoint
CREATE TABLE "client_project_member" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"token_hash" text,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_project_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"due_date" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_project_milestone_status_check" CHECK ("client_project_milestone"."status" in ('todo', 'in_progress', 'in_review', 'done'))
);
--> statement-breakpoint
CREATE TABLE "customer_address" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"inside_dhaka" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_item" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_item_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "project_type" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "budget_range" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "timeline" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "case_study" ADD CONSTRAINT "case_study_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study" ADD CONSTRAINT "case_study_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invoice" ADD CONSTRAINT "client_invoice_project_id_client_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invoice" ADD CONSTRAINT "client_invoice_payment_submitted_by_auth_user_id_fk" FOREIGN KEY ("payment_submitted_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invoice" ADD CONSTRAINT "client_invoice_confirmed_by_auth_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invoice" ADD CONSTRAINT "client_invoice_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invoice_line" ADD CONSTRAINT "client_invoice_line_invoice_id_client_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."client_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project" ADD CONSTRAINT "client_project_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project" ADD CONSTRAINT "client_project_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project" ADD CONSTRAINT "client_project_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_approval" ADD CONSTRAINT "client_project_approval_project_id_client_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_approval" ADD CONSTRAINT "client_project_approval_milestone_id_client_project_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."client_project_milestone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_approval" ADD CONSTRAINT "client_project_approval_file_id_client_project_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."client_project_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_approval" ADD CONSTRAINT "client_project_approval_requested_by_auth_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_approval" ADD CONSTRAINT "client_project_approval_decided_by_auth_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_file" ADD CONSTRAINT "client_project_file_project_id_client_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_file" ADD CONSTRAINT "client_project_file_uploaded_by_auth_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_member" ADD CONSTRAINT "client_project_member_project_id_client_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_member" ADD CONSTRAINT "client_project_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_member" ADD CONSTRAINT "client_project_member_invited_by_auth_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_project_milestone" ADD CONSTRAINT "client_project_milestone_project_id_client_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_study_public_idx" ON "case_study" USING btree ("status","display_order");--> statement-breakpoint
CREATE INDEX "client_invoice_project_idx" ON "client_invoice" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "client_invoice_line_idx" ON "client_invoice_line" USING btree ("invoice_id","display_order");--> statement-breakpoint
CREATE INDEX "client_project_status_idx" ON "client_project" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "client_project_approval_idx" ON "client_project_approval" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "client_project_file_idx" ON "client_project_file" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_project_member_email_idx" ON "client_project_member" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "client_project_member_user_idx" ON "client_project_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_project_milestone_idx" ON "client_project_milestone" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE INDEX "customer_address_user_idx" ON "customer_address" USING btree ("user_id","is_default");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: each customer's existing profile address becomes their default saved address (profile columns are kept).
INSERT INTO "customer_address" ("id", "user_id", "label", "name", "phone", "address", "area", "city", "postcode", "inside_dhaka", "is_default")
SELECT 'addr-' || p."user_id", p."user_id", 'Home', coalesce(u."name", ''), p."phone", p."address", p."area", p."city", p."postcode",
       lower(p."city") LIKE '%dhaka%', true
FROM "customer_profile" p LEFT JOIN "auth_user" u ON u."id" = p."user_id"
WHERE btrim(p."address") <> ''
ON CONFLICT ("id") DO NOTHING;
