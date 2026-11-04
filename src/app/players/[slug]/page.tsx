import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card, Empty, MatchCard, PageTitle, Pips, Streak, WinBar } from "@/components/ui";
import {
  colorStats,
  firstName,
  fmtPct,
  loadLeague,
  partnerRecords,
  pct,
  playerStandings,
  sideOfPlayer,
} from "@/lib/league";

export default async function PlayerPage({ params }: PageProps<"/players/[slug]">) {
  await connection();
  const { slug } = await params;
  const data = await loadLeague();
  const player = data.players.find((p) => p.slug === slug);
  if (!player) notFound();

  const standings = playerStandings(data);
  const rank = standings.findIndex((s) => s.player.id === player.id) + 1;
  const r = standings[rank - 1].record;
  const partners = partnerRecords(data, player.id);
  const { colors, combos } = colorStats(data.matches, player.id);
  const mine = data.matches.filter((m) => sideOfPlayer(m, player.id));

  const tiles = [
    { label: "Rank", value: `#${rank}` },
    { label: "Match record", value: `${r.matchWins}-${r.matchLosses}` },
    { label: "Match win %", value: fmtPct(pct(r.matchWins, r.matchLosses)) },
    { label: "Game record", value: `${r.gameWins}-${r.gameLosses}` },
    { label: "Points", value: String(r.points) },
    { label: "MVP cards", value: String(data.matches.filter((m) => m.mvp?.player?.id === player.id).length) },
  ];

  return (
    <div className="space-y-6">
      <PageTitle sub={<>Current streak: <Streak value={r.streak} /></>}>{player.name}</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-card p-3">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="num mt-1 text-xl font-bold">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="With each teammate">
          {partners.length === 0 ? (
            <Empty>No matches yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {partners.map(({ partner, record }) => (
                <li key={partner.id} className="flex items-center justify-between py-2">
                  <span>
                    {firstName(player.name)} & {firstName(partner.name)}
                  </span>
                  <span className="num">
                    {record.matchWins}-{record.matchLosses}
                    <span className="text-muted"> · {fmtPct(pct(record.matchWins, record.matchLosses))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Win rate by color">
          {colors.length === 0 ? (
            <Empty>No colors recorded yet.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {colors.map((c) => (
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
          {combos.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              Most played: {combos.slice(0, 3).map((c) => `${c.label} (${c.played})`).join(", ")}
            </p>
          )}
        </Card>
      </div>

      <Card title="Matches">
        {mine.length === 0 ? (
          <Empty>No matches yet.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
