CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "availability_player_id_day_unique" UNIQUE("player_id","day")
);
--> statement-breakpoint
CREATE TABLE "game_on_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_on_days_day_unique" UNIQUE("day")
);
--> statement-breakpoint
CREATE TABLE "schedule_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"player_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_responses_week_start_player_id_unique" UNIQUE("week_start","player_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"asked_by" integer,
	"last_ping_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_weeks_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
DROP TABLE "play_call_answers" CASCADE;--> statement-breakpoint
DROP TABLE "play_calls" CASCADE;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "discord_user_id" text;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_responses" ADD CONSTRAINT "schedule_responses_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_asked_by_players_id_fk" FOREIGN KEY ("asked_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;