import type { PgDatabase } from "drizzle-orm/pg-core";
import { players } from "./schema";
import { slugify } from "../lib/slug";

export const STARTING_PLAYERS = [
  "Michael Torra",
  "Vishal Parwani",
  "Grant Ferguson",
  "Taylor Grigg",
];

/** Adds the league's starting players. Safe to run repeatedly. Sets come from Scryfall when matches are recorded. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedBase(db: PgDatabase<any, any>) {
  await db
    .insert(players)
    .values(STARTING_PLAYERS.map((name) => ({ name, slug: slugify(name) })))
    .onConflictDoNothing();
}
