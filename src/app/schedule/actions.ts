"use server";

import { and, between, eq, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { dayLabel, leagueToday, ME_COOKIE, weekDays, weekStartOf } from "@/lib/config";
import { discordTags, postToDiscord } from "@/lib/discord";
import { firstName, loadLeague, pairingOptions } from "@/lib/league";

/** Minimum time between Discord pings for the same week (ask + reminders). */
const PING_COOLDOWN_MS = 3 * 60 * 60 * 1000;


/**
 * The public address to put in Discord links. Uses the production domain, never the address of
 * whatever deployment the person happened to open (Vercel asks for a login on those).
 */
async function siteUrl() {
  const fixed = process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (fixed) return (fixed.startsWith("http") ? fixed : `https://${fixed}`).replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

function validWeek(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && weekStartOf(s) === s ? s : null;
}

async function playerFrom(form: FormData) {
  const id = Number(form.get("playerId"));
  if (!id) return null;
  const db = await getDb();
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, id));
  return p ?? null;
}

async function rememberMe(playerId: number) {
  (await cookies()).set(ME_COOKIE, String(playerId), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function chooseMeAction(form: FormData) {
  const player = await playerFrom(form);
  const week = validWeek(form.get("weekStart"));
  if (player) await rememberMe(player.id);
  redirect(`/schedule${week ? `?week=${week}` : ""}`);
}

/** Saves the days a player can make in one week, then announces any day that now works for all four. */
export async function saveAvailabilityAction(form: FormData) {
  const player = await playerFrom(form);
  const week = validWeek(form.get("weekStart"));
  if (!player || !week) redirect("/schedule");
  const today = leagueToday();
  const days = weekDays(week);
  const editable = days.filter((d) => d >= today);
  const picked = new Set(form.getAll("days").map(String).filter((d) => editable.includes(d)));

  const db = await getDb();
  const before = await db
    .select({ day: schema.availability.day })
    .from(schema.availability)
    .where(and(eq(schema.availability.playerId, player.id), inArray(schema.availability.day, editable.length ? editable : [today])));
  const had = new Set(before.map((r) => r.day));
  const changed = had.size !== picked.size || [...picked].some((d) => !had.has(d));

  if (editable.length) {
    await db
      .delete(schema.availability)
      .where(and(eq(schema.availability.playerId, player.id), inArray(schema.availability.day, editable)));
  }
  if (picked.size) {
    await db.insert(schema.availability).values([...picked].map((day) => ({ playerId: player.id, day })));
  }
  await db
    .insert(schema.scheduleResponses)
    .values({ weekStart: week, playerId: player.id })
    .onConflictDoUpdate({
      target: [schema.scheduleResponses.weekStart, schema.scheduleResponses.playerId],
      set: { updatedAt: new Date() },
    });
  await rememberMe(player.id);

  if (changed) {
    const list = [...picked].sort().map((d) => dayLabel(d, { weekday: "short" }));
    await postToDiscord(
      list.length
        ? `🗓️ **${player.name}** can play ${list.join(", ")} (week of ${dayLabel(week, { month: "short", day: "numeric" })})`
        : `🗓️ **${player.name}** can't play any day the week of ${dayLabel(week, { month: "short", day: "numeric" })}`,
    );
    // A day that had been announced but now lost someone.
    const dropped = [...had].filter((d) => !picked.has(d));
    if (dropped.length) {
      const announced = await db
        .delete(schema.gameOnDays)
        .where(inArray(schema.gameOnDays.day, dropped))
        .returning();
      for (const g of announced) {
        const others = (await db.select().from(schema.players)).filter((p) => p.id !== player.id);
        await postToDiscord(`⚠️ **${player.name}** can no longer make **${dayLabel(g.day)}**.`, { tag: discordTags(others) });
      }
    }
  }
  await announceFullDays(week, await siteUrl());
  redirect(`/schedule?week=${week}&saved=1`);
}

/** Posts "Game on" (once per day) for every upcoming day in the week that works for four players. */
async function announceFullDays(week: string, url: string) {
  const db = await getDb();
  const today = leagueToday();
  const days = weekDays(week);
  const rows = await db
    .select()
    .from(schema.availability)
    .where(between(schema.availability.day, days[0], days[6]));
  const data = await loadLeague();
  for (const day of days.filter((d) => d >= today)) {
    const ids = rows.filter((r) => r.day === day).map((r) => r.playerId);
    if (ids.length < 4) continue;
    const [fresh] = await db.insert(schema.gameOnDays).values({ day }).onConflictDoNothing().returning();
    if (!fresh) continue;
    const four = data.players.filter((p) => ids.includes(p.id));
    let teams = "";
    if (four.length === 4) {
      const [best] = pairingOptions(data, four);
      const names = (t: typeof best.teamA) => t.map((p) => firstName(p.name)).join(" & ");
      teams = `\nSuggested teams: **${names(best.teamA)}** vs **${names(best.teamB)}** (${url}/pairings)`;
    }
    await postToDiscord(`🎉 **${dayLabel(day, { weekday: "long", month: "short", day: "numeric" })} works for everyone!**${teams}`, {
      tag: discordTags(four),
    });
  }
}

/** Asks the group (or reminds whoever hasn't answered) to fill in a week. Rate limited per week. */
export async function askWeekAction(form: FormData) {
  const player = await playerFrom(form);
  const week = validWeek(form.get("weekStart"));
  if (!player || !week) redirect("/schedule");
  if (weekDays(week)[6] < leagueToday()) redirect(`/schedule?week=${week}`);
  const db = await getDb();
  const url = await siteUrl();
  await db.insert(schema.scheduleWeeks).values({ weekStart: week, askedBy: player.id }).onConflictDoNothing();
  const [row] = await db.select().from(schema.scheduleWeeks).where(eq(schema.scheduleWeeks.weekStart, week));
  if (row.lastPingAt && Date.now() - row.lastPingAt.getTime() < PING_COOLDOWN_MS) {
    redirect(`/schedule?week=${week}&ping=wait`);
  }
  const answered = await db
    .select({ playerId: schema.scheduleResponses.playerId })
    .from(schema.scheduleResponses)
    .where(eq(schema.scheduleResponses.weekStart, week));
  const answeredIds = new Set(answered.map((a) => a.playerId));
  const everyone = await db.select().from(schema.players);
  const waiting = everyone.filter((p) => p.id !== player.id && !answeredIds.has(p.id));
  if (!waiting.length) redirect(`/schedule?week=${week}&ping=none`);

  const weekLabel = dayLabel(week, { month: "short", day: "numeric" });
  const isFirst = !row.lastPingAt;
  await postToDiscord(
    isFirst
      ? `📅 **${player.name}** is lining up games for the week of ${weekLabel}. Pick the days that work for you: ${url}/schedule?week=${week}`
      : `⏰ Reminder from **${player.name}**: fill in your days for the week of ${weekLabel}: ${url}/schedule?week=${week}`,
    { tag: discordTags(waiting) },
  );
  await db.update(schema.scheduleWeeks).set({ lastPingAt: new Date() }).where(eq(schema.scheduleWeeks.id, row.id));
  await rememberMe(player.id);
  redirect(`/schedule?week=${week}&ping=sent`);
}

