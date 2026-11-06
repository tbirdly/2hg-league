import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Card, Empty, MatchCard, PageTitle, Pips, Sparkline, Streak, WinBar } from "@/components/ui";
import {
  colorStats,
  firstName,
  fmtPct,
  loadLeague,
  partnerRecords,
  pct,
  playerRatings,
  playerStandings,
  rivalries,
  sideOfPlayer,
  START_RATING,
  type HeadToHeadPlayer,
} from "@/lib/league";
import type { Player } from "@/db/schema";

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
  const allRatings = playerRatings(data);
  const rating = allRatings.find((x) => x.player.id === player.id)!;
  const ratingRank = allRatings.indexOf(rating) + 1;
  const rival = rivalries(data, player.id);
  const { colors, combos } = colorStats(data.matches, player.id);
  const mine = data.matches.filter((m) => sideOfPlayer(m, player.id));

  const tiles = [
    { label: "Rank", value: `#${rank}` },
    { label: "Rating", value: `${Math.round(rating.rating)}`, hint: `#${ratingRank} by rating · peak ${Math.round(rating.peak)}` },
    { label: "Match record", value: `${r.matchWins}-${r.matchLosses}` },
    { label: "Match win %", value: fmtPct(pct(r.matchWins, r.matchLosses)) },
    { label: "Game record", value: `${r.gameWins}-${r.gameLosses}` },
    { label: "Points", value: String(r.points) },
    { label: "Best win streak", value: String(r.longestWinStreak) },
    {
      label: "MVC / LVC",
      value: `${data.matches.filter((m) => m.mvc?.player?.id === player.id).length} / ${data.matches.filter((m) => m.lvc?.player?.id === player.id).length}`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle sub={<>Current streak: <Streak value={r.streak} /></>}>{player.name}</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-card p-3">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="num mt-1 text-xl font-bold">{t.value}</div>
            {"hint" in t && t.hint && <div className="mt-0.5 text-xs text-muted">{t.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RivalTile label="Best partner" x={rival.bestPartner} />
        <RivalTile label="Worst partner" x={rival.worstPartner} />
        <RivalTile label="Nemesis" x={rival.nemesis} hint="Beats you most" />
        <RivalTile label="Favorite opponent" x={rival.favoriteOpponent} hint="You beat them most" />
      </div>

      {rating.history.length > 1 && (
        <Card title="Rating over time">
          <Sparkline values={[START_RATING, ...rating.history.map((h) => h.rating)]} base={START_RATING} />
          <p className="mt-2 text-xs text-muted">
            Starts at {START_RATING}. Beating a stronger pair earns more; losing to a weaker pair costs more.
          </p>
        </Card>
      )}

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

        <Card title="Against each opponent">
          {rival.opponents.length === 0 ? (
            <Empty>No matches yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {rival.opponents
                .sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
                .map((o) => (
                  <li key={o.other.id} className="flex items-center justify-between py-2">
                    <span>vs {o.other.name}</span>
                    <span className="num">
                      {o.wins}-{o.losses}
                      <span className="text-muted"> · {fmtPct(pct(o.wins, o.losses))}</span>
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

function RivalTile({ label, x, hint }: { label: string; x: HeadToHeadPlayer | null; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3" title={hint}>
      <div className="text-xs text-muted">{label}</div>
      {x ? (
        <>
          <PlayerLink p={x.other} />
          <div className="num text-xs text-muted">
            {x.wins}-{x.losses} · {fmtPct(pct(x.wins, x.losses))}
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm text-muted">Not enough matches</div>
      )}
    </div>
  );
}

function PlayerLink({ p }: { p: Player }) {
  return (
    <Link href={`/players/${p.slug}`} className="mt-1 block truncate font-semibold hover:underline">
      {p.name}
    </Link>
  );
}
