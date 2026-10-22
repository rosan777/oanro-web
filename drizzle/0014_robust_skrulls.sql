CREATE TABLE "customer_note" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_code" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_kind_check" CHECK ("discount_code"."kind" in ('percent', 'amount')),
	CONSTRAINT "discount_value_check" CHECK ("discount_code"."value" > 0 and ("discount_code"."kind" <> 'percent' or "discount_code"."value" <= 90)),
	CONSTRAINT "discount_used_check" CHECK ("discount_code"."used" >= 0 and ("discount_code"."max_uses" is null or "discount_code"."max_uses" > 0))
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"email" text PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"token" text NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscriber_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "order_discount" (
	"order_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"amount" integer NOT NULL,
	CONSTRAINT "order_discount_amount_check" CHECK ("order_discount"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_label" (
	"order_id" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "order_label_order_id_label_pk" PRIMARY KEY("order_id","label")
);
--> statement-breakpoint
CREATE TABLE "saved_bag" (
	"user_id" text PRIMARY KEY NOT NULL,
	"items" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_banner" (
	"id" text PRIMARY KEY NOT NULL,
	"text_en" text NOT NULL,
	"text_bn" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_author_id_auth_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code" ADD CONSTRAINT "discount_code_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_discount" ADD CONSTRAINT "order_discount_order_id_shop_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_label" ADD CONSTRAINT "order_label_order_id_shop_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_bag" ADD CONSTRAINT "saved_bag_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_banner" ADD CONSTRAINT "site_banner_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_note_user_idx" ON "customer_note" USING btree ("user_id","created_at");