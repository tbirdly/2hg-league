# The MTG Cuck Classic

Standings, results and stats for our Two-Headed Giant Magic: The Gathering league.

Teams change every session, so the site keeps a record for each **player** (the main scoreboard) and for each **pair of players** who teamed up.

## What it tracks

- Every best-of-3 match: date, set, format, both teams, and the colors each player's deck used
- Every game: who won, who was on the play, and each team's final life total
- Standings: 3 points per match win, tiebreaker game win %
- MVC (Most Valuable Card) and LVC (Least Valuable Card) for each match, with card search and images from Scryfall, plus who played each
- Player pages: record with each teammate, win rate by color, MVC and LVC counts
- Teams: record for every pairing and head-to-head results
- Stats: color and color-pair win rates, sweeps, comebacks, on-the-play win rate, closest games by final life, top MVC and LVC cards, per-set leaders

## Recording results

Go to `/admin` (link in the footer), sign in with the admin password, and click **Record a match**. You can also add players and sets there, edit or delete any match (Edit is also on each match page when you are signed in). Sets are picked from Scryfall's list when you record a match.

## Deploying on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub and choose **Add New → Project**, then import this repo.
2. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL` for you.
3. In **Settings → Environment Variables**, add `ADMIN_PASSWORD` with the password you want for the admin page.
4. Redeploy (Deployments → ⋯ → Redeploy). Each deploy creates or updates the database tables and adds the starting players automatically.

Every push to `main` deploys again on its own.

## Running locally

```bash
npm install
npm run seed:sample   # optional: fill the local database with made-up matches
npm run dev           # http://localhost:3000, admin password "dev"
```

Without a `DATABASE_URL` the app uses an embedded Postgres stored in `./.pglite`, so no database setup is needed for local work.

## Changing the database

Edit `src/db/schema.ts`, then run `npm run db:generate` to create a migration in `drizzle/`. It is applied on the next deploy.

## Stack

Next.js 16 (App Router), Tailwind CSS 4, Drizzle ORM, Neon Postgres.
