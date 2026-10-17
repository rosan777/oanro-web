CREATE TABLE "store_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_order" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text NOT NULL,
	"pay_to" text NOT NULL,
	"payer_number" text NOT NULL,
	"trx_id" text NOT NULL,
	"screenshot_data" text,
	"total" integer NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reject_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_order_code_unique" UNIQUE("code"),
	CONSTRAINT "shop_order_status_check" CHECK ("shop_order"."status" in ('pending', 'paid', 'rejected')),
	CONSTRAINT "shop_order_method_check" CHECK ("shop_order"."method" in ('bkash', 'nagad')),
	CONSTRAINT "shop_order_total_check" CHECK ("shop_order"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"size" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"stock_reserved" boolean DEFAULT false NOT NULL,
	CONSTRAINT "order_item_order_id_product_id_size_pk" PRIMARY KEY("order_id","product_id","size"),
	CONSTRAINT "order_item_quantity_check" CHECK ("order_item"."quantity" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "store_setting" ADD CONSTRAINT "store_setting_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_reviewed_by_auth_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_shop_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shop_order_trx_idx" ON "shop_order" USING btree ("method","trx_id");--> statement-breakpoint
CREATE INDEX "shop_order_status_idx" ON "shop_order" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "shop_order_user_idx" ON "shop_order" USING btree ("user_id","created_at");--> statement-breakpoint
-- Built-in roles: Manager can view and approve orders; Sales and Viewer can only view them.
INSERT INTO "role_permission" ("role_id", "permission") SELECT r.id, p.permission FROM "role" r
  JOIN (VALUES ('manager', 'orders.read'), ('manager', 'orders.manage'), ('sales', 'orders.read'), ('viewer', 'orders.read')) AS p(role_id, permission) ON p.role_id = r.id
  ON CONFLICT DO NOTHING;