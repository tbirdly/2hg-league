import Link from "next/link";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { firstName, formatDate, loadLeague, pairingOptions, playerRatings, type PairingOption } from "@/lib/league";

export const metadata = { title: "Pairings" };

export default async function PairingsPage({ searchParams }: PageProps<"/pairings">) {
  await connection();
  const data = await loadLeague();
  const { p } = await searchParams;
  const chosenIds = (Array.isArray(p) ? p : p ? [p] : []).map(Number).filter(Boolean);
  // With exactly four players in the league, they're tonight's four by default.
  const four =
    chosenIds.length > 0
      ? data.players.filter((x) => chosenIds.includes(x.id))
      : data.players.length === 4
        ? data.players
        : [];
  const options = pairingOptions(data, four);
  const ratings = new Map(playerRatings(data).map((r) => [r.player.id, r.rating]));

  return (
    <div className="space-y-6">
      <PageTitle sub="Suggests tonight's teams so everyone rotates partners. Splits you've played least come first.">
        Pairings
      </PageTitle>

      {data.players.length > 4 && (
        <Card title="Who's playing tonight?">
          <form className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {data.players.map((x) => (
                <label key={x.id} className="cursor-pointer">
                  <input type="checkbox" name="p" value={x.id} defaultChecked={four.some((f) => f.id === x.id)} className="peer sr-only" />
                  <span className="btn-ghost peer-checked:border-accent peer-checked:text-accent">{x.name}</span>
                </label>
              ))}
            </div>
            <button className="btn">Suggest teams</button>
          </form>
        </Card>
      )}

      {four.length !== 4 ? (
        <Card>
          <p className="text-sm text-muted">Pick exactly four players to see pairings.</p>
        </Card>
      ) : (
        <>
          <Option option={options[0]} ratings={ratings} featured />
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-muted">Other splits</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {options.slice(1).map((o) => (
              <Option key={o.teamA.map((x) => x.id).join("-")} option={o} ratings={ratings} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Option({
  option,
  ratings,
  featured,
}: {
  option: PairingOption;
  ratings: Map<number, number>;
  featured?: boolean;
}) {
  const { teamA, teamB, timesTogether, lastTogether, teamAWinChance } = option;
  const recordHref = `/admin/matches/new?a=${teamA.map((x) => x.id).join(",")}&b=${teamB.map((x) => x.id).join(",")}`;
  const team = (t: typeof teamA, chance: number) => (
    <div className="flex-1 rounded-lg bg-card-2/60 p-3">
      <div className={`font-semibold ${featured ? "text-lg" : ""}`}>
        {firstName(t[0].name)} & {firstName(t[1].name)}
      </div>
      <div className="num text-xs text-muted">
        {t.map((x) => Math.round(ratings.get(x.id) ?? 1500)).join(" + ")} rating · {Math.round(chance * 100)}% to win
      </div>
    </div>
  );
  return (
    <section className={`rounded-xl border bg-card p-4 ${featured ? "border-accent/70" : "border-line"}`}>
      {featured && <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Tonight&apos;s suggestion</div>}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {team(teamA, teamAWinChance)}
        <div className="text-center text-xs font-semibold text-muted">vs</div>
        {team(teamB, 1 - teamAWinChance)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {timesTogether === 0
            ? "These partnerships haven't played yet."
            : `These partnerships have played ${timesTogether} time${timesTogether === 1 ? "" : "s"}${lastTogether ? `, last on ${formatDate(lastTogether)}` : ""}.`}
        </span>
        <Link href={recordHref} className={featured ? "btn" : "btn-ghost"}>
          Record this match
        </Link>
      </div>
    </section>
  );
}
