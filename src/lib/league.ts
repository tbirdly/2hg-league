import "server-only";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Player, MtgSet } from "@/db/schema";

export type Side = "A" | "B";

export const COLOR_ORDER = ["W", "U", "B", "R", "G", "C"] as const;
export const COLOR_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

const PAIR_NAMES: Record<string, string> = {
  WU: "Azorius",
  UB: "Dimir",
  BR: "Rakdos",
  RG: "Gruul",
  WG: "Selesnya",
  WB: "Orzhov",
  UR: "Izzet",
  BG: "Golgari",
  WR: "Boros",
  UG: "Simic",
};

export function colorComboName(colors: string): string {
  if (!colors) return "Unknown";
  if (colors.length === 1) return COLOR_NAMES[colors] ?? colors;
  return PAIR_NAMES[colors] ?? `${colors.length}-color (${colors})`;
}

export type MatchSeat = { player: Player; colors: string };

export type MatchCardPick = {
  name: string;
  image: string | null;
  url: string | null;
  player: Player | null;
};

export type FullMatch = {
  id: number;
  playedOn: string;
  set: MtgSet | null;
  format: string | null;
  notes: string | null;
  /** Most Valuable Card */
  mvc: MatchCardPick | null;
  /** Least Valuable Card */
  lvc: MatchCardPick | null;
  sides: Record<Side, MatchSeat[]>;
  games: (typeof schema.games.$inferSelect)[];
  score: Record<Side, number>;
  winner: Side | null;
};

export type LeagueData = {
  players: Player[];
  sets: MtgSet[];
  matches: FullMatch[]; // newest first
};

export async function loadLeague(): Promise<LeagueData> {
  const db = await getDb();
  const [players, sets, matchRows, seatRows, gameRows] = await Promise.all([
    db.select().from(schema.players).orderBy(asc(schema.players.name)),
    db.select().from(schema.sets).orderBy(asc(schema.sets.name)),
    db
      .select()
      .from(schema.matches)
      .orderBy(desc(schema.matches.playedOn), desc(schema.matches.id)),
    db.select().from(schema.matchPlayers),
    db.select().from(schema.games).orderBy(asc(schema.games.gameNumber)),
  ]);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const setById = new Map(sets.map((s) => [s.id, s]));

  const matches: FullMatch[] = matchRows.map((m) => {
    const sides: Record<Side, MatchSeat[]> = { A: [], B: [] };
    for (const s of seatRows) {
      if (s.matchId !== m.id) continue;
      const player = playerById.get(s.playerId);
      if (player) sides[s.side as Side].push({ player, colors: s.colors });
    }
    const g = gameRows.filter((x) => x.matchId === m.id);
    const score = { A: 0, B: 0 };
    for (const x of g) score[x.winnerSide as Side]++;
    const winner: Side | null = score.A >= 2 ? "A" : score.B >= 2 ? "B" : null;
    return {
      id: m.id,
      playedOn: m.playedOn,
      set: m.setId ? (setById.get(m.setId) ?? null) : null,
      format: m.format,
      notes: m.notes,
      mvc: m.mvcCardName
        ? {
            name: m.mvcCardName,
            image: m.mvcCardImage,
            url: m.mvcCardUrl,
            player: m.mvcPlayerId ? (playerById.get(m.mvcPlayerId) ?? null) : null,
          }
        : null,
      lvc: m.lvcCardName
        ? {
            name: m.lvcCardName,
            image: m.lvcCardImage,
            url: m.lvcCardUrl,
            player: m.lvcPlayerId ? (playerById.get(m.lvcPlayerId) ?? null) : null,
          }
        : null,
      sides,
      games: g,
      score,
      winner,
    };
  });

  return { players, sets, matches };
}

export const POINTS_PER_MATCH_WIN = 3;

export type Record_ = {
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
  points: number;
  /** e.g. "W3" or "L1" */
  streak: string;
  longestWinStreak: number;
};

function emptyRecord(): Record_ {
  return {
    matchesPlayed: 0,
    matchWins: 0,
    matchLosses: 0,
    gameWins: 0,
    gameLosses: 0,
    points: 0,
    streak: "",
    longestWinStreak: 0,
  };
}

/** Builds a record from matches (any order) and a function that says which side "we" were on. */
function buildRecord(matches: FullMatch[], sideOf: (m: FullMatch) => Side | null): Record_ {
  const r = emptyRecord();
  const chronological = [...matches].sort(
    (a, b) => a.playedOn.localeCompare(b.playedOn) || a.id - b.id,
  );
  let run = 0;
  let runType = "";
  for (const m of chronological) {
    const side = sideOf(m);
    if (!side || !m.winner) continue;
    const other: Side = side === "A" ? "B" : "A";
    r.matchesPlayed++;
    r.gameWins += m.score[side];
    r.gameLosses += m.score[other];
    const won = m.winner === side;
    if (won) {
      r.matchWins++;
      r.points += POINTS_PER_MATCH_WIN;
    } else {
      r.matchLosses++;
    }
    const t = won ? "W" : "L";
    run = t === runType ? run + 1 : 1;
    runType = t;
    if (won) r.longestWinStreak = Math.max(r.longestWinStreak, run);
  }
  r.streak = runType ? `${runType}${run}` : "";
  return r;
}

export function pct(w: number, l: number): number | null {
  return w + l === 0 ? null : w / (w + l);
}

export function fmtPct(v: number | null): string {
  return v === null ? "–" : `${Math.round(v * 100)}%`;
}

export function sideOfPlayer(m: FullMatch, playerId: number): Side | null {
  if (m.sides.A.some((s) => s.player.id === playerId)) return "A";
  if (m.sides.B.some((s) => s.player.id === playerId)) return "B";
  return null;
}

function compareRecords(a: Record_, b: Record_) {
  return (
    b.points - a.points ||
    (pct(b.gameWins, b.gameLosses) ?? 0) - (pct(a.gameWins, a.gameLosses) ?? 0) ||
    b.matchesPlayed - a.matchesPlayed
  );
}

export type PlayerStanding = { player: Player; record: Record_ };

export function playerStandings(data: LeagueData, matches = data.matches): PlayerStanding[] {
  return data.players
    .map((player) => ({
      player,
      record: buildRecord(matches, (m) => sideOfPlayer(m, player.id)),
    }))
    .sort((a, b) => compareRecords(a.record, b.record) || a.player.name.localeCompare(b.player.name));
}

export type Pair = { key: string; players: [Player, Player] };

export function pairKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join("-");
}

export function sidePair(m: FullMatch, side: Side): Pair | null {
  const seats = m.sides[side];
  if (seats.length !== 2) return null;
  const ps = [...seats.map((s) => s.player)].sort((a, b) => a.name.localeCompare(b.name)) as [
    Player,
    Player,
  ];
  return { key: pairKey(ps.map((p) => p.id)), players: ps };
}

export function pairName(p: Pair): string {
  return `${firstName(p.players[0].name)} & ${firstName(p.players[1].name)}`;
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

export type TeamStanding = { pair: Pair; record: Record_ };

/** Every pair of players that has teamed up at least once. */
export function teamStandings(data: LeagueData, matches = data.matches): TeamStanding[] {
  const pairs = new Map<string, Pair>();
  for (const m of matches) {
    for (const side of ["A", "B"] as Side[]) {
      const p = sidePair(m, side);
      if (p) pairs.set(p.key, p);
    }
  }
  return [...pairs.values()]
    .map((pair) => ({
      pair,
      record: buildRecord(matches, (m) =>
        sidePair(m, "A")?.key === pair.key ? "A" : sidePair(m, "B")?.key === pair.key ? "B" : null,
      ),
    }))
    .sort((a, b) => compareRecords(a.record, b.record));
}

export type HeadToHead = { a: Pair; b: Pair; aWins: number; bWins: number };

export function headToHead(matches: FullMatch[]): HeadToHead[] {
  const map = new Map<string, HeadToHead>();
  for (const m of matches) {
    const pa = sidePair(m, "A");
    const pb = sidePair(m, "B");
    if (!pa || !pb || !m.winner) continue;
    const [first, second, firstSide] = pa.key < pb.key ? [pa, pb, "A"] : [pb, pa, "B"];
    const key = `${first.key}|${second.key}`;
    const row = map.get(key) ?? { a: first, b: second, aWins: 0, bWins: 0 };
    if (m.winner === firstSide) row.aWins++;
    else row.bWins++;
    map.set(key, row);
  }
  return [...map.values()];
}

export type ColorStat = { key: string; label: string; played: number; wins: number };

/** Win rate of decks containing each color, and of each exact color combination. */
export function colorStats(matches: FullMatch[], playerId?: number) {
  const byColor = new Map<string, ColorStat>();
  const byCombo = new Map<string, ColorStat>();
  for (const m of matches) {
    if (!m.winner) continue;
    for (const side of ["A", "B"] as Side[]) {
      for (const seat of m.sides[side]) {
        if (playerId !== undefined && seat.player.id !== playerId) continue;
        const won = m.winner === side ? 1 : 0;
        for (const c of seat.colors.split("").filter(Boolean)) {
          const s = byColor.get(c) ?? { key: c, label: COLOR_NAMES[c] ?? c, played: 0, wins: 0 };
          s.played++;
          s.wins += won;
          byColor.set(c, s);
        }
        if (seat.colors) {
          const s = byCombo.get(seat.colors) ?? {
            key: seat.colors,
            label: colorComboName(seat.colors),
            played: 0,
            wins: 0,
          };
          s.played++;
          s.wins += won;
          byCombo.set(seat.colors, s);
        }
      }
    }
  }
  const sort = (xs: ColorStat[]) => xs.sort((a, b) => b.played - a.played || b.wins - a.wins);
  return {
    colors: COLOR_ORDER.map((c) => byColor.get(c)).filter((x): x is ColorStat => !!x),
    combos: sort([...byCombo.values()]),
  };
}

/** Life left for the winning and losing team at the end of a game, if both were recorded. */
export function lifeOf(g: FullMatch["games"][number]): { winner: number; loser: number } | null {
  if (g.lifeA === null || g.lifeB === null) return null;
  return g.winnerSide === "A" ? { winner: g.lifeA, loser: g.lifeB } : { winner: g.lifeB, loser: g.lifeA };
}

export function gameStats(matches: FullMatch[]) {
  let sweeps = 0;
  let threeGame = 0;
  const closest: { match: FullMatch; game: FullMatch["games"][number]; winnerLife: number }[] = [];
  for (const m of matches) {
    if (!m.winner) continue;
    const loser: Side = m.winner === "A" ? "B" : "A";
    if (m.score[loser] === 0) sweeps++;
    else threeGame++;
    for (const g of m.games) {
      const life = lifeOf(g);
      if (life) closest.push({ match: m, game: g, winnerLife: life.winner });
    }
  }
  closest.sort((a, b) => a.winnerLife - b.winnerLife || b.match.playedOn.localeCompare(a.match.playedOn));
  return { sweeps, threeGame, closest: closest.slice(0, 5) };
}

/** Records of a player broken down by teammate. */
export function partnerRecords(data: LeagueData, playerId: number) {
  return data.players
    .filter((p) => p.id !== playerId)
    .map((partner) => {
      const together = data.matches.filter((m) => {
        const side = sideOfPlayer(m, playerId);
        return side && sideOfPlayer(m, partner.id) === side;
      });
      return { partner, record: buildRecord(together, (m) => sideOfPlayer(m, playerId)) };
    })
    .filter((x) => x.record.matchesPlayed > 0);
}

export function formatDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type CardPickKind = "mvc" | "lvc";

/** How often each card was picked as MVC or LVC, most first. */
export function cardPickCounts(matches: FullMatch[], kind: CardPickKind) {
  const map = new Map<string, { name: string; image: string | null; url: string | null; count: number }>();
  for (const m of matches) {
    const pick = m[kind];
    if (!pick) continue;
    const row = map.get(pick.name) ?? { name: pick.name, image: pick.image, url: pick.url, count: 0 };
    row.count++;
    row.image ??= pick.image;
    row.url ??= pick.url;
    map.set(pick.name, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Number of matches where each player played the MVC or LVC. */
export function cardPickPlayerCounts(data: LeagueData, kind: CardPickKind) {
  return data.players
    .map((player) => ({ player, count: data.matches.filter((m) => m[kind]?.player?.id === player.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ---------- Ratings ---------- */

export const START_RATING = 1500;
const K_FACTOR = 32;

export type RatingPoint = { matchId: number; playedOn: string; rating: number; change: number };
export type PlayerRating = { player: Player; rating: number; peak: number; history: RatingPoint[] };

function chronological(matches: FullMatch[]) {
  return [...matches].sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.id - b.id);
}

/**
 * Elo-style ratings for players. A team's strength is the average of its two players' ratings, so
 * beating a stronger pair earns more, and both teammates gain or lose the same amount.
 */
export function playerRatings(data: LeagueData): PlayerRating[] {
  const state = new Map<number, PlayerRating>(
    data.players.map((player) => [player.id, { player, rating: START_RATING, peak: START_RATING, history: [] }]),
  );
  for (const m of chronological(data.matches)) {
    if (!m.winner || m.sides.A.length === 0 || m.sides.B.length === 0) continue;
    const team = (side: Side) => m.sides[side].map((s) => state.get(s.player.id)).filter((x): x is PlayerRating => !!x);
    const a = team("A");
    const b = team("B");
    const avg = (xs: PlayerRating[]) => xs.reduce((sum, x) => sum + x.rating, 0) / xs.length;
    const expectedA = 1 / (1 + 10 ** ((avg(b) - avg(a)) / 400));
    const change = K_FACTOR * ((m.winner === "A" ? 1 : 0) - expectedA);
    for (const [members, delta] of [
      [a, change],
      [b, -change],
    ] as const) {
      for (const p of members) {
        p.rating += delta;
        p.peak = Math.max(p.peak, p.rating);
        p.history.push({ matchId: m.id, playedOn: m.playedOn, rating: p.rating, change: delta });
      }
    }
  }
  return [...state.values()].sort((x, y) => y.rating - x.rating);
}

/* ---------- Rivalries ---------- */

export type HeadToHeadPlayer = { other: Player; wins: number; losses: number };

/** A player's match record against each opponent they've faced. */
export function opponentRecords(data: LeagueData, playerId: number): HeadToHeadPlayer[] {
  const map = new Map<number, HeadToHeadPlayer>();
  for (const m of data.matches) {
    const side = sideOfPlayer(m, playerId);
    if (!side || !m.winner) continue;
    const other: Side = side === "A" ? "B" : "A";
    for (const seat of m.sides[other]) {
      const row = map.get(seat.player.id) ?? { other: seat.player, wins: 0, losses: 0 };
      if (m.winner === side) row.wins++;
      else row.losses++;
      map.set(seat.player.id, row);
    }
  }
  return [...map.values()];
}

/** Best/worst partner by win %, nemesis (worst record against) and favorite opponent (best record against). */
export function rivalries(data: LeagueData, playerId: number) {
  const partners = partnerRecords(data, playerId).map((x) => ({
    other: x.partner,
    wins: x.record.matchWins,
    losses: x.record.matchLosses,
  }));
  const opponents = opponentRecords(data, playerId);
  const rate = (x: { wins: number; losses: number }) => x.wins / (x.wins + x.losses);
  const best = (xs: HeadToHeadPlayer[]) =>
    [...xs].sort((a, b) => rate(b) - rate(a) || b.wins + b.losses - (a.wins + a.losses))[0] ?? null;
  const worst = (xs: HeadToHeadPlayer[]) =>
    [...xs].sort((a, b) => rate(a) - rate(b) || b.wins + b.losses - (a.wins + a.losses))[0] ?? null;
  return {
    partners,
    opponents,
    bestPartner: best(partners),
    worstPartner: partners.length > 1 ? worst(partners) : null,
    nemesis: worst(opponents.filter((o) => o.losses > 0)),
    favoriteOpponent: best(opponents.filter((o) => o.wins > 0)),
  };
}

/* ---------- Pairings ---------- */

export type PairingOption = {
  teamA: [Player, Player];
  teamB: [Player, Player];
  /** How many times each of the two teams has played together before. */
  timesTogether: number;
  /** Most recent date either of these teams played together, or null. */
  lastTogether: string | null;
  /** Ratings-based chance that team A wins (0..1). */
  teamAWinChance: number;
};

/**
 * All three ways to split four players into two teams, best first: the split whose partnerships have
 * happened least often (then least recently, then most evenly matched) comes first.
 */
export function pairingOptions(data: LeagueData, four: Player[]): PairingOption[] {
  if (four.length !== 4) return [];
  const ratings = new Map(playerRatings(data).map((r) => [r.player.id, r.rating]));
  const together = (x: Player, y: Player) => {
    const key = pairKey([x.id, y.id]);
    const ms = data.matches.filter((m) => sidePair(m, "A")?.key === key || sidePair(m, "B")?.key === key);
    return { count: ms.length, last: ms.map((m) => m.playedOn).sort().at(-1) ?? null };
  };
  const [p0, p1, p2, p3] = four;
  const splits: [[Player, Player], [Player, Player]][] = [
    [[p0, p1], [p2, p3]],
    [[p0, p2], [p1, p3]],
    [[p0, p3], [p1, p2]],
  ];
  return splits
    .map(([teamA, teamB]) => {
      const ta = together(...teamA);
      const tb = together(...teamB);
      const avg = (t: Player[]) => t.reduce((s, p) => s + (ratings.get(p.id) ?? START_RATING), 0) / t.length;
      return {
        teamA,
        teamB,
        timesTogether: ta.count + tb.count,
        lastTogether: [ta.last, tb.last].filter((x): x is string => !!x).sort().at(-1) ?? null,
        teamAWinChance: 1 / (1 + 10 ** ((avg(teamB) - avg(teamA)) / 400)),
      };
    })
    .sort(
      (a, b) =>
        a.timesTogether - b.timesTogether ||
        (a.lastTogether ?? "").localeCompare(b.lastTogether ?? "") ||
        Math.abs(a.teamAWinChance - 0.5) - Math.abs(b.teamAWinChance - 0.5),
    );
}
