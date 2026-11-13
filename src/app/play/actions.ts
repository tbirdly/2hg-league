"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { leagueToday } from "@/lib/config";
import { postToDiscord } from "@/lib/discord";
import { firstName, loadLeague, pairingOptions } from "@/lib/league";

async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

async function findPlayer(form: FormData) {
  const id = Number(form.get("playerId"));
  if (!id) return null;
  const db = await getDb();
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, id));
  return p ?? null;
}

async function todaysCall() {
  const db = await getDb();
  const [call] = await db.select().from(schema.playCalls).where(eq(schema.playCalls.forDate, leagueToday()));
  return call ?? null;
}

/** Records an answer. Returns true if it changed. */
async function setAnswer(callId: number, playerId: number, answer: "in" | "out") {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(schema.playCallAnswers)
    .where(and(eq(schema.playCallAnswers.callId, callId), eq(schema.playCallAnswers.playerId, playerId)));
  if (existing?.answer === answer) return false;
  await db
    .insert(schema.playCallAnswers)
    .values({ callId, playerId, answer })
    .onConflictDoUpdate({
      target: [schema.playCallAnswers.callId, schema.playCallAnswers.playerId],
      set: { answer, updatedAt: new Date() },
    });
  return true;
}

/** Once four players are in, post "Game on" (only once per call) with suggested teams. */
async function maybeGameOn(callId: number, url: string) {
  const db = await getDb();
  const answers = await db.select().from(schema.playCallAnswers).where(eq(schema.playCallAnswers.callId, callId));
  const inIds = answers.filter((a) => a.answer === "in").map((a) => a.playerId);
  if (inIds.length < 4) return;
  const claimed = await db
    .update(schema.playCalls)
    .set({ gameOnAt: new Date() })
    .where(and(eq(schema.playCalls.id, callId), isNull(schema.playCalls.gameOnAt)))
    .returning();
  if (!claimed.length) return;

  const data = await loadLeague();
  const four = data.players.filter((p) => inIds.includes(p.id));
  let teams = "";
  if (four.length === 4) {
    const [best] = pairingOptions(data, four);
    const names = (t: typeof best.teamA) => t.map((p) => firstName(p.name)).join(" & ");
    teams = `\nSuggested teams: **${names(best.teamA)}** vs **${names(best.teamB)}**`;
  }
  await postToDiscord(`🎉 **Game on!** ${four.map((p) => firstName(p.name)).join(", ")} are in.${teams}\n${url}/pairings`, {
    ping: true,
  });
}

export async function startCallAction(form: FormData) {
  const player = await findPlayer(form);
  if (!player) redirect("/play?error=pick-name");
  const db = await getDb();
  const url = await siteUrl();
  const [created] = await db
    .insert(schema.playCalls)
    .values({ forDate: leagueToday(), startedBy: player.id })
    .onConflictDoNothing()
    .returning();
  const call = created ?? (await todaysCall());
  if (!call) redirect("/play");
  await setAnswer(call.id, player.id, "in");
  if (created) {
    await postToDiscord(`🃏 **${player.name}** wants to play today. Who's in?\nAnswer here: ${url}/play`, { ping: true });
  }
  await maybeGameOn(call.id, url);
  redirect("/play");
}

export async function answerAction(form: FormData) {
  const player = await findPlayer(form);
  const answer = form.get("answer") === "in" ? "in" : form.get("answer") === "out" ? "out" : null;
  const call = await todaysCall();
  if (!player || !answer || !call) redirect("/play");
  const url = await siteUrl();
  const changed = await setAnswer(call.id, player.id, answer);
  if (changed) {
    const db = await getDb();
    const answers = await db.select().from(schema.playCallAnswers).where(eq(schema.playCallAnswers.callId, call.id));
    const inCount = answers.filter((a) => a.answer === "in").length;
    await postToDiscord(
      answer === "in"
        ? `✅ **${player.name}** is in (${inCount}/4)`
        : `❌ **${player.name}** can't play tonight (${inCount}/4 in)`,
    );
  }
  await maybeGameOn(call.id, url);
  redirect("/play");
}
