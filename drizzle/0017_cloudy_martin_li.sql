ALTER TABLE "product" ADD COLUMN "featured_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "featured_note_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "featured_note_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "featured_video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "featured_image_data" text;