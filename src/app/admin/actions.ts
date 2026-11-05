"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin, signIn, signOut } from "@/lib/auth";
import { COLOR_ORDER } from "@/lib/league";
import { slugify } from "@/lib/slug";

export type ActionResult = { error?: string; ok?: string } | undefined;

export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const ok = await signIn(String(form.get("password") ?? ""));
  if (!ok) return { error: "Wrong password." };
  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin");
}

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function onlyHttps(value: string, host: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === host ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Empty means not recorded (null); anything that isn't a whole number is invalid (undefined). */
function life(v: string): number | null | undefined {
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= -999 && n <= 999 ? n : undefined;
}

function cardPick(form: FormData, prefix: "mvc" | "lvc") {
  const name = str(form, `${prefix}CardName`).slice(0, 200) || null;
  return {
    name,
    // Only keep Scryfall links and images; anything else is dropped.
    scryfallId: name ? str(form, `${prefix}CardScryfallId`).slice(0, 64) || null : null,
    image: name ? onlyHttps(str(form, `${prefix}CardImage`), "cards.scryfall.io") : null,
    url: name ? onlyHttps(str(form, `${prefix}CardUrl`), "scryfall.com") : null,
    playerId: name ? Number(str(form, `${prefix}PlayerId`)) || null : null,
  };
}

function side(v: string): "A" | "B" | null {
  return v === "A" || v === "B" ? v : null;
}

function colorsFrom(form: FormData, key: string) {
  const picked = new Set(form.getAll(key).map(String));
  return COLOR_ORDER.filter((c) => picked.has(c)).join("");
}

type Db = Awaited<ReturnType<typeof getDb>>;

/** Reads and checks the match form. Returns an error message, or everything needed to save the match. */
async function parseMatchForm(form: FormData, db: Db) {
  const playedOn = str(form, "playedOn");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) return { error: "Pick a date." } as const;

  const seats = (["a1", "a2", "b1", "b2"] as const).map((k) => ({
    playerId: Number(str(form, `${k}_player`)),
    side: k.startsWith("a") ? "A" : "B",
    colors: colorsFrom(form, `${k}_colors`),
  }));
  if (seats.some((s) => !s.playerId)) return { error: "Choose all four players." } as const;
  if (new Set(seats.map((s) => s.playerId)).size !== 4) {
    return { error: "Each player can only be in a match once." } as const;
  }

  const gameRows: {
    gameNumber: number;
    winnerSide: "A" | "B";
    onPlaySide: "A" | "B" | null;
    lifeA: number | null;
    lifeB: number | null;
  }[] = [];
  const won = { A: 0, B: 0 };
  for (const n of [1, 2, 3]) {
    const winner = side(str(form, `g${n}_winner`));
    if (!winner) continue;
    if (won.A === 2 || won.B === 2) {
      return { error: `Game ${n} has a winner but the match was already decided. Clear game ${n}.` } as const;
    }
    won[winner]++;
    const lifeA = life(str(form, `g${n}_lifeA`));
    const lifeB = life(str(form, `g${n}_lifeB`));
    if (lifeA === undefined || lifeB === undefined) {
      return { error: `Game ${n}: life totals must be whole numbers.` } as const;
    }
    gameRows.push({ gameNumber: n, winnerSide: winner, onPlaySide: side(str(form, `g${n}_onPlay`)), lifeA, lifeB });
  }
  if (won.A < 2 && won.B < 2) {
    return { error: "A match ends when a team wins 2 games. Fill in each game's winner." } as const;
  }
  if (gameRows.some((g, i) => g.gameNumber !== i + 1)) {
    return { error: "Fill in games in order (1, 2, then 3)." } as const;
  }

  const mvc = cardPick(form, "mvc");
  const lvc = cardPick(form, "lvc");
  for (const [label, pick] of [["MVC", mvc], ["LVC", lvc]] as const) {
    if (pick.playerId && !seats.some((s) => s.playerId === pick.playerId)) {
      return { error: `The ${label}'s player has to be one of the four players in the match.` } as const;
    }
  }

  // Everything checks out; only now create a new set if one was typed in.
  // The set comes from Scryfall's list (with its code) or is typed in; save it to the league's sets.
  let setId: number | null = null;
  let setName = str(form, "setName").slice(0, 120);
  if (setName) {
    // Reuse an existing set when only the capitalization differs.
    const [same] = await db
      .select({ name: schema.sets.name })
      .from(schema.sets)
      .where(sql`lower(${schema.sets.name}) = lower(${setName})`);
    if (same) setName = same.name;
    const code = str(form, "setCode").toUpperCase().slice(0, 8) || null;
    const [row] = await db
      .insert(schema.sets)
      .values({ name: setName, code })
      .onConflictDoUpdate({
        target: schema.sets.name,
        set: { code: sql`coalesce(excluded.code, ${schema.sets.code})` },
      })
      .returning();
    setId = row.id;
  }

  return {
    error: null,
    seats,
    gameRows,
    match: {
      playedOn,
      setId,
      format: str(form, "format") || null,
      notes: str(form, "notes") || null,
      mvcCardName: mvc.name,
      mvcCardScryfallId: mvc.scryfallId,
      mvcCardImage: mvc.image,
      mvcCardUrl: mvc.url,
      mvcPlayerId: mvc.playerId,
      lvcCardName: lvc.name,
      lvcCardScryfallId: lvc.scryfallId,
      lvcCardImage: lvc.image,
      lvcCardUrl: lvc.url,
      lvcPlayerId: lvc.playerId,
    },
  } as const;
}

export async function createMatchAction(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  const parsed = await parseMatchForm(form, db);
  if (parsed.error !== null) return { error: parsed.error };

  const [match] = await db.insert(schema.matches).values(parsed.match).returning();
  try {
    await db.insert(schema.matchPlayers).values(parsed.seats.map((s) => ({ ...s, matchId: match.id })));
    await db.insert(schema.games).values(parsed.gameRows.map((g) => ({ ...g, matchId: match.id })));
  } catch (err) {
    await db.delete(schema.matches).where(eq(schema.matches.id, match.id));
    throw err;
  }
  redirect(`/matches/${match.id}`);
}

export async function updateMatchAction(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(str(form, "matchId"));
  if (!id) return { error: "Missing match." };
  const db = await getDb();
  const [existing] = await db.select({ id: schema.matches.id }).from(schema.matches).where(eq(schema.matches.id, id));
  if (!existing) return { error: "That match no longer exists." };
  const parsed = await parseMatchForm(form, db);
  if (parsed.error !== null) return { error: parsed.error };

  await db.update(schema.matches).set(parsed.match).where(eq(schema.matches.id, id));
  // Replace the seats and games with what's on the form.
  await db.delete(schema.matchPlayers).where(eq(schema.matchPlayers.matchId, id));
  await db.delete(schema.games).where(eq(schema.games.matchId, id));
  await db.insert(schema.matchPlayers).values(parsed.seats.map((s) => ({ ...s, matchId: id })));
  await db.insert(schema.games).values(parsed.gameRows.map((g) => ({ ...g, matchId: id })));
  redirect(`/matches/${id}`);
}

export async function deleteMatchAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (id) {
    const db = await getDb();
    await db.delete(schema.matches).where(eq(schema.matches.id, id));
  }
  redirect("/admin");
}

export async function addPlayerAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return { error: "Enter a name." };
  const db = await getDb();
  const rows = await db
    .insert(schema.players)
    .values({ name, slug: slugify(name) })
    .onConflictDoNothing()
    .returning();
  return rows.length ? { ok: `Added ${name}.` } : { error: `${name} is already in the league.` };
}

export async function addSetAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return { error: "Enter a set name." };
  const db = await getDb();
  const rows = await db
    .insert(schema.sets)
    .values({ name, code: str(form, "code").toUpperCase() || null })
    .onConflictDoNothing()
    .returning();
  return rows.length ? { ok: `Added ${name}.` } : { error: `${name} already exists.` };
}
