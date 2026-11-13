import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { leagueToday } from "@/lib/config";
import { discordConfigured } from "@/lib/discord";
import { formatDate } from "@/lib/league";
import { answerAction, startCallAction } from "./actions";

export const metadata = { title: "Play today?" };

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  await connection();
  const { error } = await searchParams;
  const db = await getDb();
  const today = leagueToday();
  const [players, [call]] = await Promise.all([
    db.select().from(schema.players).orderBy(schema.players.name),
    db.select().from(schema.playCalls).where(eq(schema.playCalls.forDate, today)),
  ]);
  const answers = call
    ? await db.select().from(schema.playCallAnswers).where(eq(schema.playCallAnswers.callId, call.id))
    : [];
  const answerOf = (id: number) => answers.find((a) => a.playerId === id)?.answer ?? null;
  const inCount = answers.filter((a) => a.answer === "in").length;
  const starter = call ? players.find((p) => p.id === call.startedBy) : null;

  return (
    <div className="space-y-6">
      <PageTitle sub={formatDate(today)}>Who&apos;s playing today?</PageTitle>

      {!discordConfigured() && (
        <p className="rounded-lg border border-line bg-card-2/60 p-3 text-xs text-muted">
          Discord isn&apos;t connected yet, so nothing gets posted. Add a <code>DISCORD_WEBHOOK_URL</code> in Vercel to
          turn on alerts.
        </p>
      )}

      {!call ? (
        <Card>
          <form action={startCallAction} className="space-y-4">
            <p className="text-sm text-muted">
              Press the button to ask everyone in Discord if they want to play today. You&apos;re counted as in.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select name="playerId" className="field sm:w-64" required defaultValue="">
                <option value="" disabled>
                  Who&apos;s asking?
                </option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className="btn">Who&apos;s playing today?</button>
            </div>
            {error === "pick-name" && <p className="text-sm text-loss">Pick your name first.</p>}
          </form>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted">
              {starter ? `${starter.name} asked.` : "Today's call is out."} Tap your answer.
            </p>
            <p className={`num text-lg font-bold ${inCount >= 4 ? "text-win" : "text-accent"}`}>
              {inCount >= 4 ? "Game on!" : `${inCount}/4 in`}
            </p>
          </div>
          <ul className="divide-y divide-line/60">
            {players.map((p) => {
              const a = answerOf(p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className={`text-xs ${a === "in" ? "text-win" : a === "out" ? "text-loss" : "text-muted"}`}>
                      {a === "in" ? "In" : a === "out" ? "Can't tonight" : "No answer yet"}
                    </div>
                  </div>
                  <form action={answerAction} className="flex gap-2">
                    <input type="hidden" name="playerId" value={p.id} />
                    <button
                      name="answer"
                      value="in"
                      className={a === "in" ? "btn" : "btn-ghost"}
                      aria-pressed={a === "in"}
                    >
                      I&apos;m in
                    </button>
                    <button
                      name="answer"
                      value="out"
                      className={a === "out" ? "btn-danger" : "btn-ghost"}
                      aria-pressed={a === "out"}
                    >
                      Can&apos;t tonight
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
