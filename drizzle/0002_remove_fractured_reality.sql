-- Remove the starting "Fractured Reality" set (Taylor asked for sets to come only from Scryfall). Matches that used it keep no set.
UPDATE "matches" SET "set_id" = NULL WHERE "set_id" IN (SELECT "id" FROM "sets" WHERE "name" = 'Fractured Reality');--> statement-breakpoint
DELETE FROM "sets" WHERE "name" = 'Fractured Reality';
