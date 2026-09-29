CREATE TYPE "public"."event_type" AS ENUM('stamp', 'redeem');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('stamps');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."wallet_provider" AS ENUM('google', 'apple');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('not_added', 'active', 'removed');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"stamps_count" integer DEFAULT 0 NOT NULL,
	"public_code" text NOT NULL,
	"wallet_provider" "wallet_provider" NOT NULL,
	"wallet_object_id" text NOT NULL,
	"wallet_status" "wallet_status" DEFAULT 'not_added' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_public_code_unique" UNIQUE("public_code"),
	CONSTRAINT "cards_wallet_object_id_unique" UNIQUE("wallet_object_id"),
	CONSTRAINT "cards_user_venue_uq" UNIQUE("user_id","venue_id"),
	CONSTRAINT "cards_id_venue_uq" UNIQUE("id","venue_id"),
	CONSTRAINT "cards_stamps_ck" CHECK ("cards"."stamps_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"type" "promotion_type" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_id_venue_uq" UNIQUE("id","venue_id"),
	CONSTRAINT "promotions_dates_ck" CHECK ("promotions"."ends_at" IS NULL OR "promotions"."ends_at" > "promotions"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "stamp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"request_id" uuid,
	"type" "event_type" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stamp_events_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "stamp_events_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "stamp_events_qty_ck" CHECK ("stamp_events"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "stamp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	CONSTRAINT "stamp_requests_id_venue_uq" UNIQUE("id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_country_code" text,
	"phone_national_number" text,
	"phone_verified_at" timestamp with time zone,
	"display_name" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_uq" UNIQUE("phone_country_code","phone_national_number"),
	CONSTRAINT "users_phone_required" CHECK ("users"."anonymized_at" IS NOT NULL OR ("users"."phone_country_code" IS NOT NULL AND "users"."phone_national_number" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "venue_members" (
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_members_user_id_venue_id_pk" PRIMARY KEY("user_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_promotion_id_venue_id_promotions_id_venue_id_fk" FOREIGN KEY ("promotion_id","venue_id") REFERENCES "public"."promotions"("id","venue_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_events" ADD CONSTRAINT "stamp_events_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_events" ADD CONSTRAINT "stamp_events_card_id_venue_id_cards_id_venue_id_fk" FOREIGN KEY ("card_id","venue_id") REFERENCES "public"."cards"("id","venue_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_events" ADD CONSTRAINT "stamp_events_promotion_id_venue_id_promotions_id_venue_id_fk" FOREIGN KEY ("promotion_id","venue_id") REFERENCES "public"."promotions"("id","venue_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_events" ADD CONSTRAINT "stamp_events_request_id_venue_id_stamp_requests_id_venue_id_fk" FOREIGN KEY ("request_id","venue_id") REFERENCES "public"."stamp_requests"("id","venue_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_requests" ADD CONSTRAINT "stamp_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_requests" ADD CONSTRAINT "stamp_requests_card_id_venue_id_cards_id_venue_id_fk" FOREIGN KEY ("card_id","venue_id") REFERENCES "public"."cards"("id","venue_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_members" ADD CONSTRAINT "venue_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_members" ADD CONSTRAINT "venue_members_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stamp_events_card_idx" ON "stamp_events" USING btree ("card_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stamp_requests_one_pending_uq" ON "stamp_requests" USING btree ("card_id") WHERE "stamp_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "stamp_requests_queue_idx" ON "stamp_requests" USING btree ("venue_id","created_at") WHERE "stamp_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "venue_members_venue_idx" ON "venue_members" USING btree ("venue_id");