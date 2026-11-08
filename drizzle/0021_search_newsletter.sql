CREATE TABLE "search_event" (
	"id" text PRIMARY KEY NOT NULL,
	"interaction_id" text NOT NULL,
	"kind" text NOT NULL,
	"query" text NOT NULL,
	"normalized" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"selected_type" text,
	"selected_slug" text,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_event_kind_check" CHECK ("search_event"."kind" in ('search', 'submit', 'select'))
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscriber" ADD COLUMN "source" text DEFAULT 'footer' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "search_event_once_idx" ON "search_event" USING btree ("interaction_id","kind","normalized");--> statement-breakpoint
CREATE INDEX "search_event_time_idx" ON "search_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_event_term_idx" ON "search_event" USING btree ("normalized","created_at");