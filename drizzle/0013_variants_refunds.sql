ALTER TABLE "pulse_story" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "compare_at_price" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "colors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_compare_at_check" CHECK ("product"."compare_at_price" is null or "product"."compare_at_price" >= 0);--> statement-breakpoint
CREATE TABLE "product_variant" (
	"product_id" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"size" text NOT NULL,
	"stock" integer NOT NULL,
	CONSTRAINT "product_variant_product_id_color_size_pk" PRIMARY KEY("product_id","color","size"),
	CONSTRAINT "product_variant_stock_check" CHECK ("product_variant"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "product_color_image" (
	"product_id" text NOT NULL,
	"color" text NOT NULL,
	"image_data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_color_image_product_id_color_pk" PRIMARY KEY("product_id","color")
);
--> statement-breakpoint
ALTER TABLE "product_color_image" ADD CONSTRAINT "product_color_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "color" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item" DROP CONSTRAINT "order_item_order_id_product_id_size_pk";--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_product_id_size_color_pk" PRIMARY KEY("order_id","product_id","size","color");--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "refund_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "refund_note" text;--> statement-breakpoint
ALTER TABLE "shop_order" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_refund_check" CHECK ("shop_order"."refund_amount" >= 0);
