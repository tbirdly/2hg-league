import { between, eq } from "drizzle-orm";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { addDays, dayLabel, leagueToday, ME_COOKIE, weekDays, weekStartOf } from "@/lib/config";
import { discordConfigured } from "@/lib/discord";
import { askWeekAction, chooseMeAction, saveAvailabilityAction } from "./actions";

export const metadata = { title: "Schedule" };

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  await connection();
  const sp = await searchParams;
  const today = leagueToday();
  const thisWeek = weekStartOf(today);
  const requested = typeof sp.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? weekStartOf(sp.week) : thisWeek;
  // Only this week and the next three can be viewed.
  const week = requested < thisWeek || requested > addDays(thisWeek, 21) ? thisWeek : requested;
  const days = weekDays(week);

  const db = await getDb();
  const [players, rows, responses, [weekRow]] = await Promise.all([
    db.select().from(schema.players).orderBy(schema.players.name),
    db.select().from(schema.availability).where(between(schema.availability.day, days[0], days[6])),
    db.select().from(schema.scheduleResponses).where(eq(schema.scheduleResponses.weekStart, week)),
    db.select().from(schema.scheduleWeeks).where(eq(schema.scheduleWeeks.weekStart, week)),
  ]);
  const meId = Number((await cookies()).get(ME_COOKIE)?.value);
  const me = players.find((p) => p.id === meId) ?? null;
  const free = (playerId: number, day: string) => rows.some((r) => r.playerId === playerId && r.day === day);
  const countOn = (day: string) => rows.filter((r) => r.day === day).length;
  const answered = (playerId: number) => responses.some((r) => r.playerId === playerId);
  const waiting = players.filter((p) => !answered(p.id));
  const fullDays = days.filter((d) => d >= today && countOn(d) >= 4);
  const asker = weekRow ? players.find((p) => p.id === weekRow.askedBy) : null;

  const weekLink = (offset: number) => `/schedule?week=${addDays(week, offset * 7)}`;
  const notice =
    sp.saved === "1"
      ? "Saved. Thanks!"
      : sp.ping === "sent"
        ? "Sent to Discord."
        : sp.ping === "wait"
          ? "Discord was pinged for this week in the last 3 hours. Try again later, or sign in on the Admin page to resend now."
          : sp.ping === "none"
            ? "Everyone has already answered for this week."
            : null;

  return (
    <div className="space-y-6">
      <PageTitle sub="Tick the days you can play. When a day works for all four, Discord gets a Game on message.">
        Schedule
      </PageTitle>

      <div className="flex items-center justify-between gap-2">
        {week > thisWeek ? (
          <Link href={weekLink(-1)} className="btn-ghost">
            ← Earlier
          </Link>
        ) : (
          <span />
        )}
        <div className="text-center">
          <div className="font-semibold">
            {dayLabel(days[0], { month: "short", day: "numeric" })} – {dayLabel(days[6], { month: "short", day: "numeric" })}
          </div>
          <div className="text-xs text-muted">{week === thisWeek ? "This week" : week === addDays(thisWeek, 7) ? "Next week" : ""}</div>
        </div>
        {week < addDays(thisWeek, 21) ? (
          <Link href={weekLink(1)} className="btn-ghost">
            Later →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {notice && <p className="rounded-lg border border-accent/50 bg-card p-3 text-sm">{notice}</p>}
      {!discordConfigured() && (
        <p className="rounded-lg border border-line bg-card-2/60 p-3 text-xs text-muted">
          Discord isn&apos;t connected yet, so nothing gets posted. Add <code>DISCORD_WEBHOOK_URL</code> in Vercel to turn on
          messages.
        </p>
      )}

      {fullDays.length > 0 && (
        <div className="rounded-xl border border-win/60 bg-card p-4">
          <div className="text-sm font-semibold text-win">Works for everyone</div>
          <div className="mt-1 text-lg font-bold">
            {fullDays.map((d) => dayLabel(d, { weekday: "long", month: "short", day: "numeric" })).join(" · ")}
          </div>
          <Link href="/pairings" className="mt-2 inline-block text-sm text-accent hover:underline">
            See suggested teams →
          </Link>
        </div>
      )}

      <Card title="Who can play">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-2 py-2 text-left font-normal">Player</th>
                {days.map((d) => (
                  <th key={d} className={`px-1 py-2 text-center font-normal ${d < today ? "opacity-40" : ""}`}>
                    <div className="uppercase">{dayLabel(d, { weekday: "short" }).slice(0, 2)}</div>
                    <div className="num">{dayLabel(d, { day: "numeric" })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="px-2 py-2">
                    <div className="max-w-24 truncate sm:max-w-none">{p.name.split(" ")[0]}</div>
                    {!answered(p.id) && <div className="text-[10px] text-muted">no answer</div>}
                  </td>
                  {days.map((d) => (
                    <td key={d} className={`px-1 py-2 text-center ${d < today ? "opacity-40" : ""}`}>
                      {free(p.id, d) ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-win/20 text-win" aria-label="Free">
                          ✓
                        </span>
                      ) : (
                        <span className="text-line">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-2 py-2 text-xs text-muted">Free</td>
                {days.map((d) => (
                  <td
                    key={d}
                    className={`num px-1 py-2 text-center text-xs font-semibold ${
                      countOn(d) >= 4 && d >= today ? "text-win" : "text-muted"
                    } ${d < today ? "opacity-40" : ""}`}
                  >
                    {countOn(d)}/4
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={me ? `Your days, ${me.name.split(" ")[0]}` : "Your days"}>
        <form action={chooseMeAction} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="weekStart" value={week} />
          <label className="text-muted" htmlFor="me">
            I&apos;m
          </label>
          <select id="me" name="playerId" className="field w-auto" defaultValue={me?.id ?? ""} required>
            <option value="" disabled>
              Pick your name
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost">{me ? "Switch" : "Continue"}</button>
        </form>

        {me && (
          <form action={saveAvailabilityAction} className="space-y-4">
            <input type="hidden" name="playerId" value={me.id} />
            <input type="hidden" name="weekStart" value={week} />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {days.map((d) => (
                <label key={d} className={d < today ? "cursor-not-allowed opacity-40" : "cursor-pointer"}>
                  <input
                    type="checkbox"
                    name="days"
                    value={d}
                    defaultChecked={free(me.id, d)}
                    disabled={d < today}
                    className="peer sr-only"
                  />
                  <span className="flex flex-col items-center rounded-lg border border-line px-2 py-3 text-sm peer-checked:border-win peer-checked:bg-win/15 peer-checked:text-win peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    <span className="font-semibold">{dayLabel(d, { weekday: "short" })}</span>
                    <span className="num text-xs text-muted">{dayLabel(d, { month: "short", day: "numeric" })}</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="btn w-full sm:w-auto">Save my days</button>
          </form>
        )}
      </Card>

      {me && days[6] >= today && (
        <Card title="Ask the group">
          <form action={askWeekAction} className="flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="playerId" value={me.id} />
            <input type="hidden" name="weekStart" value={week} />
            <p className="text-sm text-muted">
              {weekRow?.lastPingAt
                ? `${asker ? `${asker.name.split(" ")[0]} asked` : "Asked"} already. Remind ${
                    waiting.filter((p) => p.id !== me.id).length
                  } who haven't answered.`
                : "Tag everyone in Discord to fill in this week."}
            </p>
            <button className="btn-ghost">{weekRow?.lastPingAt ? "Send a reminder" : "Ask in Discord"}</button>
          </form>
        </Card>
      )}
    </div>
  );
}
