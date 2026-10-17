ALTER TABLE "shop_order" ADD COLUMN "payment_type" text DEFAULT 'prepaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "delivery_charge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "cod_due" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "cod_collected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "cod_collected_by" text;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_cod_collected_by_auth_user_id_fk" FOREIGN KEY ("cod_collected_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_payment_type_check" CHECK ("shop_order"."payment_type" in ('prepaid', 'cod'));--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_cod_check" CHECK ("shop_order"."delivery_charge" >= 0 and "shop_order"."cod_due" >= 0);--> statement-breakpoint
INSERT INTO "store_setting" ("key", "value") VALUES ('delivery.charge', '120'), ('cod.limit', '5000') ON CONFLICT ("key") DO NOTHING;
