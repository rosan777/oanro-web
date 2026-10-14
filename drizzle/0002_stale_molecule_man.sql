CREATE TABLE "pulse_story" (
	"id" text PRIMARY KEY NOT NULL,
	"publisher" text NOT NULL,
	"headline" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"published_at" timestamp with time zone,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text NOT NULL,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pulse_story_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "website_section" (
	"code" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pulse_story" ADD CONSTRAINT "pulse_story_approved_by_auth_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_section" ADD CONSTRAINT "website_section_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pulse_story_visibility_idx" ON "pulse_story" USING btree ("visible","approved_at");