import Link from "next/link";
import { connection } from "next/server";
import { Card, Empty, MatchCard, PageTitle, RecordCells, RecordHead } from "@/components/ui";
import { LEAGUE_NAME } from "@/lib/config";
import { loadLeague, pairName, playerStandings, teamStandings } from "@/lib/league";

export default async function Home() {
  await connection();
  const data = await loadLeague();
  const players = playerStandings(data);
  const teams = teamStandings(data);
  const recent = data.matches.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageTitle sub={`${data.matches.length} matches played · 3 points per match win, then game win %`}>
        {LEAGUE_NAME} standings
      </PageTitle>

      <Card title="Players">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm">
            <RecordHead first="Player" />
            <tbody>
              {players.map((s, i) => (
                <tr key={s.player.id} className="border-b border-line/60 last:border-0">
                  <td className="num px-2 py-2 text-muted">{i + 1}</td>
                  <td className="px-2 py-2">
                    <Link href={`/players/${s.player.slug}`} className="font-medium hover:underline">
                      {s.player.name}
                    </Link>
                  </td>
                  <RecordCells r={s.record} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Teams" action={<Link href="/teams" className="text-xs text-accent hover:underline">Head to head</Link>}>
          {teams.length === 0 ? (
            <Empty>No matches yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/60 text-sm">
              {teams.map((t) => (
                <li key={t.pair.key} className="flex items-center justify-between py-2">
                  <span>{pairName(t.pair)}</span>
                  <span className="num text-muted">
                    <span className="text-text">
                      {t.record.matchWins}-{t.record.matchLosses}
                    </span>{" "}
                    · games {t.record.gameWins}-{t.record.gameLosses}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent matches" action={<Link href="/matches" className="text-xs text-accent hover:underline">All matches</Link>}>
          {recent.length === 0 ? (
            <Empty>No matches yet. Record one from the admin page.</Empty>
          ) : (
            <div className="space-y-2">
              {recent.map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
