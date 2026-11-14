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
  /** Discord user ID (a long number), used to tag the player in Discord messages. */
  discordUserId: text("discord_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Magic sets, picked from Scryfall (name and set code). */
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
  /** MVC (Most Valuable Card) of the match, looked up on Scryfall, and who played it. */
  mvcCardName: text("mvc_card_name"),
  mvcCardScryfallId: text("mvc_card_scryfall_id"),
  mvcCardImage: text("mvc_card_image"),
  mvcCardUrl: text("mvc_card_url"),
  mvcPlayerId: integer("mvc_player_id").references(() => players.id),
  /** LVC (Least Valuable Card) of the match, and who played it. */
  lvcCardName: text("lvc_card_name"),
  lvcCardScryfallId: text("lvc_card_scryfall_id"),
  lvcCardImage: text("lvc_card_image"),
  lvcCardUrl: text("lvc_card_url"),
  lvcPlayerId: integer("lvc_player_id").references(() => players.id),
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
    /** Which side went first. No longer recorded or shown (removed from the form 2026-11-07); kept for old data. */
    onPlaySide: text("on_play_side"),
    /** Each team's shared life total when the game ended (2HG starts at 30). */
    lifeA: integer("life_a"),
    lifeB: integer("life_b"),
  },
  (t) => [unique().on(t.matchId, t.gameNumber)],
);

export type Player = typeof players.$inferSelect;
export type MtgSet = typeof sets.$inferSelect;

/** A week on the schedule (weeks start on Monday). Created when someone asks for availability. */
export const scheduleWeeks = pgTable("schedule_weeks", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),
  askedBy: integer("asked_by").references(() => players.id),
  /** Last time Discord was pinged for this week (the ask or a reminder), to prevent spamming. */
  lastPingAt: timestamp("last_ping_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** One row per day a player can play. */
export const availability = pgTable(
  "availability",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    day: date("day").notNull(),
  },
  (t) => [unique().on(t.playerId, t.day)],
);

/** Marks that a player has filled in a week, so "no days work" differs from "hasn't answered". */
export const scheduleResponses = pgTable(
  "schedule_responses",
  {
    id: serial("id").primaryKey(),
    weekStart: date("week_start").notNull(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.weekStart, t.playerId)],
);

/** Days that were announced in Discord as working for everyone, so each is only announced once. */
export const gameOnDays = pgTable("game_on_days", {
  id: serial("id").primaryKey(),
  day: date("day").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
