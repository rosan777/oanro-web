ALTER TABLE "product" ADD COLUMN "cost_price" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "low_stock_at" integer;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_cost_check" CHECK ("product"."cost_price" is null or "product"."cost_price" >= 0);--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_low_stock_check" CHECK ("product"."low_stock_at" is null or "product"."low_stock_at" >= 0);--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "shipping_cost" integer;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_shipping_cost_check" CHECK ("shop_order"."shipping_cost" is null or "shop_order"."shipping_cost" >= 0);--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "unit_cost" integer;--> statement-breakpoint
CREATE INDEX "shop_order_reviewed_idx" ON "shop_order" USING btree ("status","reviewed_at");
