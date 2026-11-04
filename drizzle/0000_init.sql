CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"game_number" integer NOT NULL,
	"winner_side" text NOT NULL,
	"on_play_side" text,
	"turns" integer,
	"win_type" text,
	CONSTRAINT "games_match_id_game_number_unique" UNIQUE("match_id","game_number")
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"side" text NOT NULL,
	"colors" text DEFAULT '' NOT NULL,
	CONSTRAINT "match_players_match_id_player_id_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"played_on" date NOT NULL,
	"set_id" integer,
	"format" text,
	"notes" text,
	"mvp_card_name" text,
	"mvp_card_scryfall_id" text,
	"mvp_card_image" text,
	"mvp_card_url" text,
	"mvp_player_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_name_unique" UNIQUE("name"),
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_mvp_player_id_players_id_fk" FOREIGN KEY ("mvp_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;