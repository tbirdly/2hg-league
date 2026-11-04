import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/** People in the league. Teams are not stored: a team is whichever two players sat together in a match. */
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Magic sets, e.g. "Fractured Reality". */
export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** One best-of-3 Two-Headed Giant match between side A and side B. */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  playedOn: date("played_on").notNull(),
  setId: integer("set_id").references(() => sets.id),
  /** draft, sealed, constructed, other */
  format: text("format"),
  notes: text("notes"),
  /** MVP card of the match, looked up on Scryfall. */
  mvpCardName: text("mvp_card_name"),
  mvpCardScryfallId: text("mvp_card_scryfall_id"),
  mvpCardImage: text("mvp_card_image"),
  mvpCardUrl: text("mvp_card_url"),
  /** Who played the MVP card. */
  mvpPlayerId: integer("mvp_player_id").references(() => players.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Which player sat on which side of a match, and the colors of the deck they played. */
export const matchPlayers = pgTable(
  "match_players",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    /** "A" or "B" */
    side: text("side").notNull(),
    /** Color letters in WUBRG order, e.g. "UR". "C" for colorless. */
    colors: text("colors").notNull().default(""),
  },
  (t) => [unique().on(t.matchId, t.playerId)],
);

/** Each game inside a match (1 to 3). The match score is derived from these rows. */
export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    gameNumber: integer("game_number").notNull(),
    /** "A" or "B" */
    winnerSide: text("winner_side").notNull(),
    /** Which side went first, if recorded. */
    onPlaySide: text("on_play_side"),
    turns: integer("turns"),
    /** damage, poison, mill, concede, other */
    winType: text("win_type"),
  },
  (t) => [unique().on(t.matchId, t.gameNumber)],
);

export type Player = typeof players.$inferSelect;
export type MtgSet = typeof sets.$inferSelect;
