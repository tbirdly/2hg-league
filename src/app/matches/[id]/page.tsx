import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card, CardImage, PageTitle, Pips } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { colorComboName, formatDate, loadLeague, pairName, sidePair, type Side } from "@/lib/league";

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  await connection();
  const { id } = await params;
  const data = await loadLeague();
  const m = data.matches.find((x) => x.id === Number(id));
  if (!m) notFound();

  const admin = await isAdmin();
  const label = (side: Side) => {
    const p = sidePair(m, side);
    return p ? pairName(p) : `Side ${side}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub={[formatDate(m.playedOn), m.set?.name, m.format].filter(Boolean).join(" · ")}>
          {label("A")} vs {label("B")}
        </PageTitle>
        {admin && (
          <Link href={`/admin/matches/${m.id}/edit`} className="btn-ghost">
            Edit match
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["A", "B"] as Side[]).map((side) => (
          <Card key={side}>
            <div className="mb-3 flex items-center justify-between">
              <span className={`text-sm font-semibold ${m.winner === side ? "text-win" : "text-muted"}`}>
                {m.winner === side ? "Winner" : "Runner-up"}
              </span>
              <span className={`num text-3xl font-bold ${m.winner === side ? "text-win" : "text-muted"}`}>
                {m.score[side]}
              </span>
            </div>
            <ul className="space-y-2">
              {m.sides[side].map((s) => (
                <li key={s.player.id} className="flex items-center justify-between">
                  <Link href={`/players/${s.player.slug}`} className="font-medium hover:underline">
                    {s.player.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {colorComboName(s.colors)} <Pips colors={s.colors} size="md" />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {(m.mvc || m.lvc) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["MVC: Most Valuable Card", m.mvc],
            ["LVC: Least Valuable Card", m.lvc],
          ] as const).map(([title, pick]) =>
            pick ? (
              <Card key={title} title={title}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <CardImage name={pick.name} image={pick.image} url={pick.url} />
                  <div>
                    <div className="text-lg font-bold">{pick.name}</div>
                    {pick.player && (
                      <div className="text-sm text-muted">
                        Played by{" "}
                        <Link href={`/players/${pick.player.slug}`} className="text-text hover:underline">
                          {pick.player.name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : null,
          )}
        </div>
      )}

      <Card title="Games">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2">Game</th>
              <th className="py-2">Winner</th>
              <th className="py-2">On the play</th>
              <th className="py-2 pl-3 text-right">{label("A")} life</th>
              <th className="py-2 pl-3 text-right">{label("B")} life</th>
            </tr>
          </thead>
          <tbody>
            {m.games.map((g) => (
              <tr key={g.id} className="border-b border-line/60 last:border-0">
                <td className="num py-2">{g.gameNumber}</td>
                <td className="py-2">{label(g.winnerSide as Side)}</td>
                <td className="py-2 text-muted">{g.onPlaySide ? label(g.onPlaySide as Side) : "–"}</td>
                <LifeCell value={g.lifeA} won={g.winnerSide === "A"} />
                <LifeCell value={g.lifeB} won={g.winnerSide === "B"} />
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {m.notes && (
        <Card title="Notes">
          <p className="whitespace-pre-wrap text-sm">{m.notes}</p>
        </Card>
      )}
    </div>
  );
}

function LifeCell({ value, won }: { value: number | null; won: boolean }) {
  return (
    <td className={`num py-2 pl-3 text-right font-semibold ${won ? "text-win" : "text-muted"}`}>{value ?? "–"}</td>
  );
}
