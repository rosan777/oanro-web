CREATE TABLE "product_collection" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"preset" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"headline_en" text DEFAULT '' NOT NULL,
	"headline_bn" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_bn" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "product_collection_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_collection_status_check" CHECK ("product_collection"."status" in ('draft', 'published', 'hidden')),
	CONSTRAINT "product_collection_preset_check" CHECK ("product_collection"."preset" in ('seasonal', 'caps', 'tech', 'general'))
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title_en" text NOT NULL,
	"title_bn" text DEFAULT '' NOT NULL,
	"word" text DEFAULT '' NOT NULL,
	"category_en" text DEFAULT '' NOT NULL,
	"category_bn" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"summary_bn" text DEFAULT '' NOT NULL,
	"detail_en" text DEFAULT '' NOT NULL,
	"detail_bn" text DEFAULT '' NOT NULL,
	"image_data" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "service_slug_unique" UNIQUE("slug"),
	CONSTRAINT "service_status_check" CHECK ("service"."status" in ('draft', 'published', 'hidden'))
);
--> statement-breakpoint
-- Built-in sections. Caps and Tech keep the visibility currently set by the website_section switches.
INSERT INTO "product_collection" ("id", "slug", "preset", "status", "name_en", "name_bn", "headline_en", "headline_bn", "description_en", "description_bn", "display_order") VALUES
('seasonal', 'seasonal', 'seasonal', 'published', 'Seasonal collection', 'মৌসুমি কালেকশন', 'Your next discovery.', 'আপনার পরবর্তী আবিষ্কার।', 'A first look at the possibilities. Sample products, made for exploration.', 'সম্ভাবনার প্রথম ঝলক। দেখার জন্য তৈরি নমুনা পণ্য।', 0),
('caps', 'caps', 'caps', CASE WHEN EXISTS (SELECT 1 FROM "website_section" WHERE "code" = 'caps' AND "enabled") THEN 'published' ELSE 'hidden' END, 'Caps collection', 'ক্যাপ কালেকশন', 'Find your fit.', 'আপনার মাপের ক্যাপ খুঁজুন।', 'Cap styles we''re exploring. Product details and availability will appear when confirmed.', 'যে ক্যাপ স্টাইলগুলো নিয়ে আমরা কাজ করছি। নিশ্চিত হলে বিস্তারিত ও প্রাপ্যতা জানানো হবে।', 10),
('tech', 'tech', 'tech', CASE WHEN EXISTS (SELECT 1 FROM "website_section" WHERE "code" = 'tech-items' AND "enabled") THEN 'published' ELSE 'hidden' END, 'Tech items', 'টেক আইটেম', 'Everyday technology.', 'প্রতিদিনের প্রযুক্তি।', 'A preview of technology categories. Products will appear as they are confirmed.', 'প্রযুক্তি ক্যাটাগরির প্রিভিউ। নিশ্চিত হলে পণ্য যুক্ত হবে।', 20);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "collection_id" text DEFAULT 'seasonal' NOT NULL;--> statement-breakpoint
-- The demo headphones already appear in the Tech items row; keep them there.
UPDATE "product" SET "collection_id" = 'tech' WHERE "slug" = 'studio-headphones';--> statement-breakpoint
ALTER TABLE "product_collection" ADD CONSTRAINT "product_collection_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection" ADD CONSTRAINT "product_collection_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_collection_id_product_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."product_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_storefront_idx" ON "service" USING btree ("status","display_order");