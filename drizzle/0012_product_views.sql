CREATE TABLE "product_view_daily" (
	"product_id" text NOT NULL,
	"day" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_view_daily_product_id_day_pk" PRIMARY KEY("product_id","day")
);
--> statement-breakpoint
ALTER TABLE "product_view_daily" ADD CONSTRAINT "product_view_daily_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_view_day_idx" ON "product_view_daily" USING btree ("day");
