"use server";

import { eq } from "drizzle-orm";
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

function side(v: string): "A" | "B" | null {
  return v === "A" || v === "B" ? v : null;
}

function colorsFrom(form: FormData, key: string) {
  const picked = new Set(form.getAll(key).map(String));
  return COLOR_ORDER.filter((c) => picked.has(c)).join("");
}

export async function createMatchAction(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();

  const playedOn = str(form, "playedOn");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) return { error: "Pick a date." };

  let setId: number | null = Number(str(form, "setId")) || null;
  const newSet = str(form, "newSet");
  if (newSet) {
    const [row] = await db
      .insert(schema.sets)
      .values({ name: newSet })
      .onConflictDoUpdate({ target: schema.sets.name, set: { name: newSet } })
      .returning();
    setId = row.id;
  }

  const seats = (["a1", "a2", "b1", "b2"] as const).map((k) => ({
    playerId: Number(str(form, `${k}_player`)),
    side: k.startsWith("a") ? "A" : "B",
    colors: colorsFrom(form, `${k}_colors`),
  }));
  if (seats.some((s) => !s.playerId)) return { error: "Choose all four players." };
  if (new Set(seats.map((s) => s.playerId)).size !== 4) return { error: "Each player can only be in a match once." };

  const gameRows: { gameNumber: number; winnerSide: "A" | "B"; onPlaySide: "A" | "B" | null; turns: number | null; winType: string | null }[] = [];
  const won = { A: 0, B: 0 };
  for (const n of [1, 2, 3]) {
    const winner = side(str(form, `g${n}_winner`));
    if (!winner) continue;
    if (won.A === 2 || won.B === 2) return { error: `Game ${n} has a winner but the match was already decided.` };
    won[winner]++;
    const turns = Number(str(form, `g${n}_turns`));
    gameRows.push({
      gameNumber: n,
      winnerSide: winner,
      onPlaySide: side(str(form, `g${n}_onPlay`)),
      turns: Number.isFinite(turns) && turns > 0 ? Math.round(turns) : null,
      winType: str(form, `g${n}_winType`) || null,
    });
  }
  if (gameRows.length !== new Set(gameRows.map((g) => g.gameNumber)).size || won.A < 2 && won.B < 2) {
    return { error: "A match ends when a team wins 2 games. Fill in each game's winner." };
  }
  if (gameRows.some((g, i) => g.gameNumber !== i + 1)) return { error: "Fill in games in order (1, 2, then 3)." };

  const [match] = await db
    .insert(schema.matches)
    .values({
      playedOn,
      setId,
      format: str(form, "format") || null,
      notes: str(form, "notes") || null,
    })
    .returning();
  try {
    await db.insert(schema.matchPlayers).values(seats.map((s) => ({ ...s, matchId: match.id })));
    await db.insert(schema.games).values(gameRows.map((g) => ({ ...g, matchId: match.id })));
  } catch (err) {
    await db.delete(schema.matches).where(eq(schema.matches.id, match.id));
    throw err;
  }
  redirect(`/matches/${match.id}`);
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
