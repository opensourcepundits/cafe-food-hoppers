CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"district" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_priority" integer DEFAULT 0 NOT NULL,
	"work_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"announcements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"menu" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "idx_venues_featured" ON "venues" USING btree ("is_featured" DESC NULLS LAST,"featured_priority" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_venues_district" ON "venues" USING btree ("district");--> statement-breakpoint
CREATE INDEX "idx_venues_work_info" ON "venues" USING gin ("work_info");--> statement-breakpoint
CREATE INDEX "idx_venues_menu" ON "venues" USING gin ("menu" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_venues_specials" ON "venues" USING gin ("specials");