import { connection } from "next/server";
import { Card, Empty, PageTitle, RecordCells, RecordHead } from "@/components/ui";
import { headToHead, loadLeague, pairName, teamStandings } from "@/lib/league";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  await connection();
  const data = await loadLeague();
  const teams = teamStandings(data);
  const h2h = headToHead(data.matches);

  return (
    <div className="space-y-6">
      <PageTitle sub="Teams change every session, so each pair of players gets its own record.">Teams</PageTitle>

      <Card title="Team records">
        {teams.length === 0 ? (
          <Empty>No matches yet.</Empty>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <RecordHead first="Team" />
              <tbody>
                {teams.map((t, i) => (
                  <tr key={t.pair.key} className="border-b border-line/60 last:border-0">
                    <td className="num px-2 py-2 text-muted">{i + 1}</td>
                    <td className="px-2 py-2 font-medium">{pairName(t.pair)}</td>
                    <RecordCells r={t.record} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Head to head">
        {h2h.length === 0 ? (
          <Empty>No matches yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/60 text-sm">
            {h2h.map((h) => (
              <li key={`${h.a.key}|${h.b.key}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className={h.aWins > h.bWins ? "font-semibold" : ""}>{pairName(h.a)}</span>
                <span className="num rounded-md bg-card-2 px-2 py-0.5">
                  {h.aWins} – {h.bWins}
                </span>
                <span className={h.bWins > h.aWins ? "font-semibold" : ""}>{pairName(h.b)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
