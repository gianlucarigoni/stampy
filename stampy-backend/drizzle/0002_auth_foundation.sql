CREATE TYPE "public"."auth_event_type" AS ENUM('otp_sent', 'otp_send_blocked', 'otp_failed', 'otp_verified', 'login_success', 'identity_linked', 'google_untrusted_email_rejected', 'logout', 'session_revoked');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('email', 'google');--> statement-breakpoint
CREATE TYPE "public"."otp_channel" AS ENUM('email');--> statement-breakpoint
CREATE TABLE "auth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "auth_event_type" NOT NULL,
	"provider" "identity_provider",
	"subject_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"email_at_provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "auth_identities_provider_uq" UNIQUE("provider","provider_user_id"),
	CONSTRAINT "auth_identities_user_provider_uq" UNIQUE("user_id","provider"),
	CONSTRAINT "auth_identities_email_normalized_ck" CHECK ("auth_identities"."provider" <> 'email' OR "auth_identities"."provider_user_id" = lower(btrim("auth_identities"."provider_user_id"))),
	CONSTRAINT "auth_identities_email_at_provider_ck" CHECK ("auth_identities"."email_at_provider" IS NULL OR "auth_identities"."email_at_provider" = lower(btrim("auth_identities"."email_at_provider")))
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "otp_channel" NOT NULL,
	"destination" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_challenges_attempts_ck" CHECK ("otp_challenges"."attempts" >= 0),
	CONSTRAINT "otp_challenges_destination_ck" CHECK ("otp_challenges"."channel" <> 'email' OR "otp_challenges"."destination" = lower(btrim("otp_challenges"."destination")))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"auth_provider" "identity_provider" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_uq" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_phone_uq";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_phone_required";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_events_user_idx" ON "auth_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_events_type_idx" ON "auth_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_challenges_one_active_uq" ON "otp_challenges" USING btree ("channel","destination") WHERE "otp_challenges"."consumed_at" IS NULL AND "otp_challenges"."invalidated_at" IS NULL;--> statement-breakpoint
CREATE INDEX "otp_challenges_destination_idx" ON "otp_challenges" USING btree ("channel","destination","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_country_code";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_national_number";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_verified_at";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_uq" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_ck" CHECK ("users"."email" = lower(btrim("users"."email")));