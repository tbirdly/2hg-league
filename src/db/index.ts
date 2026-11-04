import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = databaseUrl();
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }
  if (process.env.VERCEL) {
    throw new Error(
      "No database configured. Add a Neon Postgres database in the Vercel project's Storage tab, then redeploy.",
    );
  }
  // Local development without a database URL: use an embedded Postgres stored in ./.pglite
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle(new PGlite("./.pglite"), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  globalForDb.__db ??= createDb().catch((err) => {
    globalForDb.__db = undefined; // let the next request try again
    throw err;
  });
  return globalForDb.__db;
}

export { schema };
