/**
 * Runs database migrations and adds the starting players and sets.
 * Runs automatically before `next build`, so every Vercel deploy keeps the database up to date.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { seedBase } from "../src/db/base-seed";

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    console.log(
      "[migrate] No DATABASE_URL set, skipping. (Locally the app uses an embedded database in ./.pglite.)",
    );
    return;
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedBase(db);
  console.log("[migrate] Database is up to date.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
