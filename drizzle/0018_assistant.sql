CREATE TABLE "assistant_faq" (
	"id" text PRIMARY KEY NOT NULL,
	"question_en" text NOT NULL,
	"question_bn" text DEFAULT '' NOT NULL,
	"answer_en" text NOT NULL,
	"answer_bn" text DEFAULT '' NOT NULL,
	"keywords" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_handoff" (
	"dedupe_key" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_log" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"provider" text,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assistant_log_role_check" CHECK ("assistant_log"."role" in ('user', 'assistant')),
	CONSTRAINT "assistant_log_source_check" CHECK ("assistant_log"."source" in ('ai', 'faq', 'system'))
);
--> statement-breakpoint
CREATE TABLE "assistant_session" (
	"id" text PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"outcome" text DEFAULT 'open' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assistant_session_outcome_check" CHECK ("assistant_session"."outcome" in ('open', 'answered', 'faq', 'unanswered', 'handoff', 'error'))
);
--> statement-breakpoint
CREATE TABLE "assistant_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_unanswered" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"excerpt" text NOT NULL,
	"reason" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "assistant_usage" (
	"day" text NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"audio_seconds" integer DEFAULT 0 NOT NULL,
	"model" text,
	CONSTRAINT "assistant_usage_day_provider_kind_pk" PRIMARY KEY("day","provider","kind"),
	CONSTRAINT "assistant_usage_kind_check" CHECK ("assistant_usage"."kind" in ('chat', 'transcribe'))
);
--> statement-breakpoint
ALTER TABLE "assistant_faq" ADD CONSTRAINT "assistant_faq_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_handoff" ADD CONSTRAINT "assistant_handoff_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_log" ADD CONSTRAINT "assistant_log_session_id_assistant_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assistant_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_setting" ADD CONSTRAINT "assistant_setting_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_unanswered" ADD CONSTRAINT "assistant_unanswered_session_id_assistant_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assistant_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_unanswered" ADD CONSTRAINT "assistant_unanswered_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_log_session_idx" ON "assistant_log" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "assistant_log_expiry_idx" ON "assistant_log" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "assistant_session_last_idx" ON "assistant_session" USING btree ("last_at");--> statement-breakpoint
CREATE INDEX "assistant_session_expiry_idx" ON "assistant_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "assistant_unanswered_open_idx" ON "assistant_unanswered" USING btree ("resolved_at","created_at");--> statement-breakpoint
CREATE INDEX "assistant_unanswered_expiry_idx" ON "assistant_unanswered" USING btree ("expires_at");