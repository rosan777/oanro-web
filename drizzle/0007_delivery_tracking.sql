ALTER TABLE "shop_order" ADD COLUMN "delivery_status" text;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "courier" text;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "tracking_code" text;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_delivery_check" CHECK ("shop_order"."delivery_status" is null or "shop_order"."delivery_status" in ('processing', 'shipped', 'out_for_delivery', 'delivered', 'returned'));--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"stage" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_shop_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "customer_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"alt_phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"permanent_address" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id","created_at");--> statement-breakpoint
-- Backfill: existing orders get their timeline so far; already-paid orders start delivery at "processing".
UPDATE "shop_order" SET "delivery_status" = 'processing' WHERE "status" = 'paid' AND "delivery_status" IS NULL;--> statement-breakpoint
INSERT INTO "order_event" ("id", "order_id", "stage", "note", "actor_id", "created_at")
  SELECT gen_random_uuid()::text, "id", 'placed', '', "user_id", "created_at" FROM "shop_order";--> statement-breakpoint
INSERT INTO "order_event" ("id", "order_id", "stage", "note", "actor_id", "created_at")
  SELECT gen_random_uuid()::text, "id", CASE WHEN "status" = 'paid' THEN 'paid' ELSE 'rejected' END, coalesce("reject_reason", ''), "reviewed_by", coalesce("reviewed_at", "updated_at")
  FROM "shop_order" WHERE "status" IN ('paid', 'rejected');