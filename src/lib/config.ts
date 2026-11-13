export const LEAGUE_NAME = "The MTG Cuck Classic";
export const LEAGUE_TAGLINE = "Two-Headed Giant league";

/** The league plays in Eastern time; "today" for game calls and new matches uses this zone. */
export const LEAGUE_TIMEZONE = "America/New_York";

/** Today's date (YYYY-MM-DD) in the league's time zone. */
export function leagueToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: LEAGUE_TIMEZONE });
}
