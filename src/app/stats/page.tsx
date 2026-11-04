import { connection } from "next/server";
import { Card, CardImage, Empty, PageTitle, Pips, WinBar } from "@/components/ui";
import { colorStats, fmtPct, gameStats, loadLeague, mvpCardCounts, mvpPlayerCounts, playerStandings } from "@/lib/league";

export const metadata = { title: "Stats" };

export default async function StatsPage() {
  await connection();
  const data = await loadLeague();
  const { colors, combos } = colorStats(data.matches);
  const g = gameStats(data.matches);
  const mvpCards = mvpCardCounts(data.matches);
  const mvpPlayers = mvpPlayerCounts(data);

  const tiles = [
    { label: "Matches", value: String(data.matches.length) },
    { label: "Sweeps (2-0)", value: String(g.sweeps) },
    { label: "Went to game 3", value: String(g.threeGame) },
    { label: "Comebacks", value: String(g.comebacks), hint: "Lost game 1, won the match" },
    { label: "On the play wins", value: fmtPct(g.onPlayWinRate), hint: `${g.onPlayGames} games recorded` },
    { label: "Avg game length", value: g.averageTurns ? `${g.averageTurns.toFixed(1)} turns` : "–" },
  ];

  const bySet = data.sets
    .map((set) => {
      const ms = data.matches.filter((m) => m.set?.id === set.id);
      const leader = playerStandings(data, ms)[0];
      return { set, count: ms.length, leader };
    })
    .filter((x) => x.count > 0);

  return (
    <div className="space-y-6">
      <PageTitle>Stats</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-card p-3" title={t.hint}>
            <div className="text-xs text-muted">{t.label}</div>
            <div className="num mt-1 text-xl font-bold">{t.value}</div>
          </div>
        ))}
      </div>

      <Card title="MVP cards">
        {mvpCards.length === 0 ? (
          <Empty>No MVP cards picked yet.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {mvpCards.slice(0, 6).map((c) => (
                <div key={c.name} className="text-center text-xs">
                  <CardImage name={c.name} image={c.image} url={c.url} className="w-full" />
                  <div className="mt-1 truncate font-medium">{c.name}</div>
                  <div className="text-muted">
                    {c.count} MVP{c.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
            {mvpPlayers.length > 0 && (
              <p className="mt-4 text-sm text-muted">
                MVP cards played:{" "}
                {mvpPlayers.map((x) => `${x.player.name} ${x.count}`).join(" · ")}
              </p>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Win rate by color">
          {colors.length === 0 ? (
            <Empty>No colors recorded yet.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {colors.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Pips colors={c.key} /> {c.label}
                    <span className="text-xs text-muted">({c.played} decks)</span>
                  </span>
                  <WinBar wins={c.wins} played={c.played} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Color combinations">
          {combos.length === 0 ? (
            <Empty>No colors recorded yet.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {combos.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Pips colors={c.key} /> {c.label}
                    <span className="text-xs text-muted">({c.played})</span>
                  </span>
                  <WinBar wins={c.wins} played={c.played} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="How games end">
          {g.winTypes.length === 0 ? (
            <Empty>Nothing recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {g.winTypes.map(([type, n]) => (
                <li key={type} className="flex justify-between py-2 capitalize">
                  <span>{type}</span>
                  <span className="num text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="By set">
          {bySet.length === 0 ? (
            <Empty>No matches yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {bySet.map(({ set, count, leader }) => (
                <li key={set.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {set.name} <span className="text-muted">· {count} matches</span>
                  </span>
                  <span className="text-muted">
                    Leader: <span className="text-text">{leader.player.name}</span> ({leader.record.matchWins}-
                    {leader.record.matchLosses})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
