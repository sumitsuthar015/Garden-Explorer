CREATE TYPE "public"."activity_type" AS ENUM('observation', 'yes_no', 'multiple_choice', 'selection', 'thinking');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."age_group" AS ENUM('all-ages', 'ages-5-8', 'ages-9-12', 'ages-13-plus');--> statement-breakpoint
CREATE TYPE "public"."analytics_event" AS ENUM('QR_SCANNED', 'LOCATION_VIEWED', 'ACTIVITY_STARTED', 'ACTIVITY_COMPLETED', 'QUIZ_STARTED', 'QUESTION_ANSWERED', 'QUIZ_COMPLETED', 'TRAIL_STARTED', 'TRAIL_COMPLETED', 'BADGE_EARNED');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_PUBLISHED', 'LOCATION_UNPUBLISHED', 'LOCATION_ARCHIVED', 'LOCATION_DELETED', 'CONTENT_BLOCK_CREATED', 'CONTENT_BLOCK_UPDATED', 'CONTENT_BLOCK_DELETED', 'ACTIVITY_CREATED', 'ACTIVITY_UPDATED', 'ACTIVITY_DELETED', 'QUIZ_CREATED', 'QUIZ_UPDATED', 'QUIZ_PUBLISHED', 'QUIZ_UNPUBLISHED', 'QUIZ_DELETED', 'QUESTION_CREATED', 'QUESTION_UPDATED', 'QUESTION_DELETED', 'QR_CREATED', 'QR_UPDATED', 'QR_DISABLED', 'QR_ENABLED', 'QR_REGENERATED', 'QR_DELETED', 'TRAIL_CREATED', 'TRAIL_UPDATED', 'TRAIL_REORDERED', 'TRAIL_PUBLISHED', 'TRAIL_UNPUBLISHED', 'TRAIL_DELETED', 'BADGE_CREATED', 'BADGE_UPDATED', 'BADGE_DELETED', 'MEDIA_UPLOADED', 'MEDIA_DELETED', 'SETTINGS_UPDATED', 'ADMIN_PASSWORD_CHANGED', 'ADMIN_CREATED');--> statement-breakpoint
CREATE TYPE "public"."badge_criteria" AS ENUM('locations_completed', 'trail_completed', 'trails_completed', 'quiz_first_try', 'activities_completed', 'xp_earned', 'category_completed', 'location_completed', 'quiz_accuracy');--> statement-breakpoint
CREATE TYPE "public"."content_block_type" AS ENUM('text', 'image', 'fact', 'did_you_know', 'science', 'observation', 'thinking', 'activity', 'quiz', 'callout', 'video', 'audio');--> statement-breakpoint
CREATE TYPE "public"."location_category" AS ENUM('plants', 'animals', 'science', 'environment', 'garden-knowledge', 'logic', 'observation');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."question_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."trail_difficulty" AS ENUM('easy', 'moderate', 'challenging');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gardens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"logo_public_id" text,
	"cover_image_url" text,
	"cover_image_public_id" text,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"type" "content_block_type" DEFAULT 'text' NOT NULL,
	"title" text,
	"body" text DEFAULT '' NOT NULL,
	"media_url" text,
	"media_public_id" text,
	"media_alt" text,
	"media_caption" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garden_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" "location_category" DEFAULT 'plants' NOT NULL,
	"hero_image_url" text,
	"hero_image_public_id" text,
	"hero_image_alt" text,
	"icon" text,
	"estimated_minutes" integer DEFAULT 5 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"type" "activity_type" DEFAULT 'observation' NOT NULL,
	"prompt" text NOT NULL,
	"hint" text,
	"success_message" text DEFAULT 'Nice work!' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"hint" text,
	"explanation" text,
	"points" integer DEFAULT 20 NOT NULL,
	"difficulty" "question_difficulty" DEFAULT 'easy' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"title" text DEFAULT 'Quick Quiz' NOT NULL,
	"description" text,
	"completion_points" integer DEFAULT 25 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trail_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"instruction_to_next" text DEFAULT '' NOT NULL,
	"estimated_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garden_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"goals" text DEFAULT '' NOT NULL,
	"difficulty" "trail_difficulty" DEFAULT 'easy' NOT NULL,
	"age_group" "age_group" DEFAULT 'all-ages' NOT NULL,
	"estimated_minutes" integer DEFAULT 45 NOT NULL,
	"cover_image_url" text,
	"cover_image_public_id" text,
	"cover_image_alt" text,
	"theme_color" text,
	"icon" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_code" text NOT NULL,
	"location_id" uuid NOT NULL,
	"primary_trail_id" uuid,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"label" text,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '🏅' NOT NULL,
	"criteria_type" "badge_criteria" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid,
	"location_id" uuid,
	"visitor_id" text,
	"completed" boolean DEFAULT true NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "analytics_event" NOT NULL,
	"location_id" uuid,
	"trail_id" uuid,
	"quiz_id" uuid,
	"badge_code" text,
	"visitor_id" text,
	"value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid,
	"question_id" uuid,
	"option_id" uuid,
	"location_id" uuid,
	"visitor_id" text,
	"is_correct" boolean NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"used_hint" boolean DEFAULT false NOT NULL,
	"revealed" boolean DEFAULT false NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_id" uuid,
	"public_code" text NOT NULL,
	"location_id" uuid,
	"trail_id" uuid,
	"visitor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"secure_url" text NOT NULL,
	"resource_type" text DEFAULT 'image' NOT NULL,
	"format" text,
	"bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"original_filename" text,
	"alt" text,
	"folder" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" text,
	"admin_email" text,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_label" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garden_id" uuid NOT NULL,
	"site_title" text DEFAULT 'Garden Explorer' NOT NULL,
	"seo_description" text DEFAULT 'Explore the garden with QR learning trails, activities and quizzes.' NOT NULL,
	"primary_color" text DEFAULT '#2F6B4F' NOT NULL,
	"logo_url" text,
	"logo_public_id" text,
	"favicon_url" text,
	"favicon_public_id" text,
	"contact_email" text,
	"contact_phone" text,
	"contact_address" text,
	"default_trail_id" uuid,
	"analytics_enabled" boolean DEFAULT true NOT NULL,
	"privacy_notes" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_content_blocks" ADD CONSTRAINT "location_content_blocks_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_facts" ADD CONSTRAINT "location_facts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_stops" ADD CONSTRAINT "trail_stops_trail_id_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_stops" ADD CONSTRAINT "trail_stops_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trails" ADD CONSTRAINT "trails_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_primary_trail_id_trails_id_fk" FOREIGN KEY ("primary_trail_id") REFERENCES "public"."trails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_trail_id_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_events" ADD CONSTRAINT "quiz_attempt_events_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_events" ADD CONSTRAINT "quiz_attempt_events_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_events" ADD CONSTRAINT "quiz_attempt_events_option_id_quiz_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."quiz_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_events" ADD CONSTRAINT "quiz_attempt_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_qr_id_qr_codes_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_trail_id_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_trail_id_trails_id_fk" FOREIGN KEY ("default_trail_id") REFERENCES "public"."trails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "gardens_slug_unique_idx" ON "gardens" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "location_content_blocks_location_id_idx" ON "location_content_blocks" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_content_blocks_order_idx" ON "location_content_blocks" USING btree ("location_id","display_order");--> statement-breakpoint
CREATE INDEX "location_content_blocks_status_idx" ON "location_content_blocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "location_facts_location_id_idx" ON "location_facts" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_facts_order_idx" ON "location_facts" USING btree ("location_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_slug_unique_idx" ON "locations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "locations_status_idx" ON "locations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "locations_garden_id_idx" ON "locations" USING btree ("garden_id");--> statement-breakpoint
CREATE INDEX "locations_category_idx" ON "locations" USING btree ("category");--> statement-breakpoint
CREATE INDEX "locations_featured_idx" ON "locations" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "activities_location_id_idx" ON "activities" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "activities_order_idx" ON "activities" USING btree ("location_id","display_order");--> statement-breakpoint
CREATE INDEX "quiz_options_question_id_idx" ON "quiz_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_options_order_idx" ON "quiz_options" USING btree ("question_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_options_single_correct_idx" ON "quiz_options" USING btree ("question_id") WHERE "quiz_options"."is_correct" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_options_question_text_unique_idx" ON "quiz_options" USING btree ("question_id","text");--> statement-breakpoint
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_order_idx" ON "quiz_questions" USING btree ("quiz_id","display_order");--> statement-breakpoint
CREATE INDEX "quiz_questions_difficulty_idx" ON "quiz_questions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "quizzes_location_id_idx" ON "quizzes" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "quizzes_status_idx" ON "quizzes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_stops_trail_position_unique_idx" ON "trail_stops" USING btree ("trail_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_stops_trail_location_unique_idx" ON "trail_stops" USING btree ("trail_id","location_id");--> statement-breakpoint
CREATE INDEX "trail_stops_trail_id_idx" ON "trail_stops" USING btree ("trail_id");--> statement-breakpoint
CREATE INDEX "trail_stops_position_idx" ON "trail_stops" USING btree ("trail_id","position");--> statement-breakpoint
CREATE INDEX "trail_stops_location_id_idx" ON "trail_stops" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trails_slug_unique_idx" ON "trails" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "trails_status_idx" ON "trails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trails_garden_id_idx" ON "trails" USING btree ("garden_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_codes_public_code_unique_idx" ON "qr_codes" USING btree ("public_code");--> statement-breakpoint
CREATE INDEX "qr_codes_status_idx" ON "qr_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qr_codes_location_id_idx" ON "qr_codes" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "qr_codes_primary_trail_id_idx" ON "qr_codes" USING btree ("primary_trail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_code_unique_idx" ON "badges" USING btree ("code");--> statement-breakpoint
CREATE INDEX "badges_status_idx" ON "badges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activity_events_activity_id_idx" ON "activity_events" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_events_created_at_idx" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_events_location_id_idx" ON "activity_events" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "analytics_events_name_idx" ON "analytics_events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_location_id_idx" ON "analytics_events" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "analytics_events_trail_id_idx" ON "analytics_events" USING btree ("trail_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_events_question_id_idx" ON "quiz_attempt_events" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_events_created_at_idx" ON "quiz_attempt_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quiz_attempt_events_location_id_idx" ON "quiz_attempt_events" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_events_quiz_id_idx" ON "quiz_attempt_events" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "scan_events_qr_id_idx" ON "scan_events" USING btree ("qr_id");--> statement-breakpoint
CREATE INDEX "scan_events_created_at_idx" ON "scan_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scan_events_location_id_idx" ON "scan_events" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "scan_events_trail_id_idx" ON "scan_events" USING btree ("trail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_public_id_unique_idx" ON "media_assets" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_assets_folder_idx" ON "media_assets" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_garden_unique_idx" ON "site_settings" USING btree ("garden_id");