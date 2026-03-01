CREATE TABLE IF NOT EXISTS "giveaways" (
  "id" serial PRIMARY KEY,
  "guild_id" varchar(20) NOT NULL,
  "channel_id" varchar(20) NOT NULL,
  "message_id" varchar(20) NOT NULL,
  "name" text NOT NULL,
  "winner_count" integer NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "ended" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "giveaway_entries" (
  "id" serial PRIMARY KEY,
  "giveaway_id" integer NOT NULL REFERENCES "giveaways"("id") ON DELETE CASCADE,
  "user_id" varchar(20) NOT NULL,
  "entered_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "giveaway_entries_giveaway_id_user_id_unique" ON "giveaway_entries" ("giveaway_id", "user_id");
CREATE INDEX IF NOT EXISTS "giveaway_entries_giveaway_id_index" ON "giveaway_entries" ("giveaway_id");
