CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"category_en" text DEFAULT '' NOT NULL,
	"category_bn" text DEFAULT '' NOT NULL,
	"tagline_en" text DEFAULT '' NOT NULL,
	"tagline_bn" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_bn" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"stock" integer,
	"sizes" jsonb NOT NULL,
	"specs_en" jsonb NOT NULL,
	"specs_bn" jsonb NOT NULL,
	"image_data" text,
	"image_position" text DEFAULT '50% 50%' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_status_check" CHECK ("product"."status" in ('draft', 'published', 'hidden')),
	CONSTRAINT "product_price_check" CHECK ("product"."price" >= 0),
	CONSTRAINT "product_stock_check" CHECK ("product"."stock" is null or "product"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_storefront_idx" ON "product" USING btree ("status","display_order");