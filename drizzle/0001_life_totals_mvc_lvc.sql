ALTER TABLE "matches" RENAME COLUMN "mvp_card_name" TO "mvc_card_name";--> statement-breakpoint
ALTER TABLE "matches" RENAME COLUMN "mvp_card_scryfall_id" TO "mvc_card_scryfall_id";--> statement-breakpoint
ALTER TABLE "matches" RENAME COLUMN "mvp_card_image" TO "mvc_card_image";--> statement-breakpoint
ALTER TABLE "matches" RENAME COLUMN "mvp_card_url" TO "mvc_card_url";--> statement-breakpoint
ALTER TABLE "matches" RENAME COLUMN "mvp_player_id" TO "mvc_player_id";--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_mvp_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "life_a" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "life_b" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "lvc_card_name" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "lvc_card_scryfall_id" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "lvc_card_image" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "lvc_card_url" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "lvc_player_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_mvc_player_id_players_id_fk" FOREIGN KEY ("mvc_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_lvc_player_id_players_id_fk" FOREIGN KEY ("lvc_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "turns";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "win_type";