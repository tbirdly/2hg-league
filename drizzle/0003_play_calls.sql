CREATE TABLE "play_call_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"answer" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "play_call_answers_call_id_player_id_unique" UNIQUE("call_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "play_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"for_date" date NOT NULL,
	"started_by" integer,
	"game_on_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "play_calls_for_date_unique" UNIQUE("for_date")
);
--> statement-breakpoint
ALTER TABLE "play_call_answers" ADD CONSTRAINT "play_call_answers_call_id_play_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."play_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_call_answers" ADD CONSTRAINT "play_call_answers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_calls" ADD CONSTRAINT "play_calls_started_by_players_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;