/**
 * Fills the LOCAL embedded database (./.pglite) with made-up matches so the pages have something to show.
 * Never touches a real database: it refuses to run when DATABASE_URL is set.
 *   npm run seed:sample
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { seedBase } from "../src/db/base-seed";
import { games, matchPlayers, matches, players, sets } from "../src/db/schema";

const COLORS = ["W", "U", "B", "R", "G"];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

async function main() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    throw new Error("seed:sample only runs against the local embedded database. Unset DATABASE_URL.");
  }
  const db = drizzle(new PGlite("./.pglite"));
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedBase(db);
  await db.delete(matches);

  const allPlayers = await db.select().from(players);
  const [set] = await db.select().from(sets);
  const rand = rng(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const deck = () => {
    const a = pick(COLORS);
    let b = pick(COLORS);
    while (b === a) b = pick(COLORS);
    return COLORS.filter((c) => c === a || c === b).join("");
  };

  const start = new Date("2026-09-01");
  for (let i = 0; i < 12; i++) {
    const day = new Date(start.getTime() + i * 7 * 86400000);
    const order = [...allPlayers].sort(() => rand() - 0.5);
    const [m] = await db
      .insert(matches)
      .values({
        playedOn: day.toISOString().slice(0, 10),
        setId: set.id,
        format: "draft",
        mvcCardName: pick(["Lightning Bolt", "Llanowar Elves", "Counterspell", "Serra Angel", "Shivan Dragon"]),
        mvcPlayerId: pick(order.slice(0, 4)).id,
        lvcCardName: pick(["Squire", "Wood Elemental", "Mudhole", "One with Nothing"]),
        lvcPlayerId: pick(order.slice(0, 4)).id,
      })
      .returning();
    await db.insert(matchPlayers).values(
      order.slice(0, 4).map((p, idx) => ({
        matchId: m.id,
        playerId: p.id,
        side: idx < 2 ? "A" : "B",
        colors: deck(),
      })),
    );
    const won = { A: 0, B: 0 };
    let n = 1;
    let onPlay: "A" | "B" = rand() < 0.5 ? "A" : "B";
    while (won.A < 2 && won.B < 2) {
      const winner: "A" | "B" = rand() < (order[0].id % 2 ? 0.6 : 0.45) ? "A" : "B";
      won[winner]++;
      await db.insert(games).values({
        matchId: m.id,
        gameNumber: n++,
        winnerSide: winner,
        onPlaySide: onPlay,
        lifeA: winner === "A" ? 1 + Math.floor(rand() * 25) : -Math.floor(rand() * 4),
        lifeB: winner === "B" ? 1 + Math.floor(rand() * 25) : -Math.floor(rand() * 4),
      });
      onPlay = winner === "A" ? "B" : "A"; // loser chooses to play
    }
  }
  console.log("Sample data loaded into ./.pglite");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
