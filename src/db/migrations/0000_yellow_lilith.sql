CREATE TABLE IF NOT EXISTS "giveaway_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "giveaways" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"message_id" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"winner_count" integer NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"ended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "giveaway_entries_giveaway_id_user_id_unique" ON "giveaway_entries" USING btree ("giveaway_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "giveaway_entries_giveaway_id_index" ON "giveaway_entries" USING btree ("giveaway_id");