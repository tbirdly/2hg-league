export const LEAGUE_NAME = "The MTG Cuck Classic";
export const LEAGUE_TAGLINE = "Two-Headed Giant league";

/** The league plays in Eastern time; "today" for game calls and new matches uses this zone. */
export const LEAGUE_TIMEZONE = "America/New_York";

/** Today's date (YYYY-MM-DD) in the league's time zone. */
export function leagueToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: LEAGUE_TIMEZONE });
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The Monday on or before a YYYY-MM-DD date. Weeks on the schedule run Monday to Sunday. */
export function weekStartOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}

/** The seven dates of the week starting on `weekStart`. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "Thu, Nov 19" style label for a YYYY-MM-DD date. */
export function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** Cookie remembering which player is using this browser on the Schedule page. */
export const ME_COOKIE = "league_me";
