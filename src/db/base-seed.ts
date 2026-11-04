import type { PgDatabase } from "drizzle-orm/pg-core";
import { players, sets } from "./schema";
import { slugify } from "../lib/slug";

export const STARTING_PLAYERS = [
  "Michael Torra",
  "Vishal Parwani",
  "Grant Ferguson",
  "Taylor Grigg",
];

export const STARTING_SETS = ["Fractured Reality"];

/** Adds the league's starting players and sets. Safe to run repeatedly. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedBase(db: PgDatabase<any, any>) {
  await db
    .insert(players)
    .values(STARTING_PLAYERS.map((name) => ({ name, slug: slugify(name) })))
    .onConflictDoNothing();
  await db
    .insert(sets)
    .values(STARTING_SETS.map((name) => ({ name })))
    .onConflictDoNothing();
}
