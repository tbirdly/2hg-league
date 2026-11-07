import { connection } from "next/server";
import Link from "next/link";
import { Card, CardImage, Empty, PageTitle, Pips, WinBar } from "@/components/ui";
import {
  cardPickCounts,
  cardPickPlayerCounts,
  colorStats,
  formatDate,
  gameStats,
  loadLeague,
  pairName,
  playerStandings,
  sidePair,
  type CardPickKind,
  type LeagueData,
} from "@/lib/league";

export const metadata = { title: "Stats" };

export default async function StatsPage() {
  await connection();
  const data = await loadLeague();
  const { colors, combos } = colorStats(data.matches);
  const g = gameStats(data.matches);

  const tiles = [
    { label: "Matches", value: String(data.matches.length) },
    { label: "Sweeps (2-0)", value: String(g.sweeps) },
    { label: "Went to game 3", value: String(g.threeGame) },
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

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-card p-3">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="num mt-1 text-xl font-bold">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardPicks data={data} kind="mvc" title="MVC: Most Valuable Cards" />
        <CardPicks data={data} kind="lvc" title="LVC: Least Valuable Cards" />
      </div>

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

        <Card title="Closest games">
          {g.closest.length === 0 ? (
            <Empty>Record final life totals to see the closest games.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {g.closest.map(({ match, game, winnerLife }) => {
                const w = sidePair(match, game.winnerSide as "A" | "B");
                return (
                  <li key={game.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/matches/${match.id}`} className="hover:underline">
                      {w ? pairName(w) : "?"} won game {game.gameNumber}
                      <span className="text-muted"> · {formatDate(match.playedOn)}</span>
                    </Link>
                    <span className="num">
                      at <span className="font-semibold text-accent">{winnerLife}</span> life
                    </span>
                  </li>
                );
              })}
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

function CardPicks({ data, kind, title }: { data: LeagueData; kind: CardPickKind; title: string }) {
  const cards = cardPickCounts(data.matches, kind);
  const players = cardPickPlayerCounts(data, kind);
  const label = kind.toUpperCase();
  return (
    <Card title={title}>
      {cards.length === 0 ? (
        <Empty>No {label} picked yet.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {cards.slice(0, 3).map((c) => (
              <div key={c.name} className="text-center text-xs">
                <CardImage name={c.name} image={c.image} url={c.url} className="w-full" />
                <div className="mt-1 truncate font-medium">{c.name}</div>
                <div className="text-muted">
                  {c.count}× {label}
                </div>
              </div>
            ))}
          </div>
          {cards.length > 3 && (
            <p className="mt-3 text-xs text-muted">
              Also: {cards.slice(3, 10).map((c) => `${c.name} (${c.count})`).join(", ")}
            </p>
          )}
          {players.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Played by: {players.map((x) => `${x.player.name} ${x.count}`).join(" · ")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
