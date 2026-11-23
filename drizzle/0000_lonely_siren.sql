CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"username" text,
	"first_name" text,
	"is_premium" boolean DEFAULT false NOT NULL,
	"package_type" text,
	"premium_expires_at" timestamp with time zone,
	"referral_code" text NOT NULL,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"free_days_earned" integer DEFAULT 0 NOT NULL,
	"referred_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"access_type" text DEFAULT 'direct' NOT NULL,
	"sections" text DEFAULT 'home' NOT NULL,
	"monetag_zone_id" text,
	"ad_timer" integer,
	"adsgram_block_id" text,
	"ads_required" integer DEFAULT 1 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"pin_order" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"block_type" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"display_name" text NOT NULL,
	"url" text NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_bdt" integer NOT NULL,
	"price_gbp" integer NOT NULL,
	"duration" integer NOT NULL,
	"duration_unit" text DEFAULT 'days' NOT NULL,
	"features" text,
	"video_call_access" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'local' NOT NULL,
	"emoji" text,
	"name" text NOT NULL,
	"logo_url" text,
	"phone_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"user_name" text,
	"sender_number" text,
	"proof_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_call_girls" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"image_url" text,
	"service_start" text,
	"service_end" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"total_fake_calls" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_token" text,
	"chat_id" text,
	"premium_group_link" text,
	"site_name" text DEFAULT 'Dark Would Expose' NOT NULL,
	"site_logo" text,
	"primary_color" text,
	"secondary_color" text,
	"channel_link" text,
	"group_link" text,
	"support_link" text,
	"telegram_username" text,
	"enable_notice" boolean DEFAULT false NOT NULL,
	"notice_text" text,
	"payment_instructions" text,
	"enable_referral" boolean DEFAULT true NOT NULL,
	"postgres_enabled" boolean DEFAULT true NOT NULL,
	"mongodb_enabled" boolean DEFAULT false NOT NULL,
	"mongodb_uri" text,
	"mongodb_database_name" text,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"maintenance_message" text,
	"favicon_url" text,
	"webhook_url" text,
	"webhook_registered_at" timestamp with time zone,
	"last_backup_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"friends_count" integer NOT NULL,
	"free_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"watched_ads" integer DEFAULT 0 NOT NULL,
	"is_unlocked" boolean DEFAULT false NOT NULL,
	"last_ad_watched_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ymid" text NOT NULL,
	"user_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"zone_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rewarded_at" timestamp with time zone,
	CONSTRAINT "ad_sessions_ymid_unique" UNIQUE("ymid")
);
--> statement-breakpoint
CREATE TABLE "premium_gallery" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"medias" text DEFAULT '[]' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"admin" text DEFAULT 'admin' NOT NULL,
	"ip_address" text,
	"method" text,
	"path" text,
	"status_code" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"hide_for_premium" boolean DEFAULT true NOT NULL,
	"header_script" text,
	"popunder_script" text,
	"top_banner" text,
	"top_banner_enabled" boolean DEFAULT true NOT NULL,
	"bottom_banner" text,
	"bottom_banner_enabled" boolean DEFAULT true NOT NULL,
	"feed_banner" text,
	"feed_banner_enabled" boolean DEFAULT true NOT NULL,
	"monetag_zone_id" text,
	"direct_link_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
