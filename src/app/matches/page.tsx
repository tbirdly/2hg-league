import Link from "next/link";
import { connection } from "next/server";
import { Empty, MatchCard, PageTitle } from "@/components/ui";
import { loadLeague } from "@/lib/league";

export const metadata = { title: "Matches" };

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  await connection();
  const { set } = await searchParams;
  const data = await loadLeague();
  const setId = typeof set === "string" ? Number(set) : undefined;
  const matches = setId ? data.matches.filter((m) => m.set?.id === setId) : data.matches;

  return (
    <div>
      <PageTitle sub={`${matches.length} matches`}>Matches</PageTitle>
      {data.sets.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <Link href="/matches" className={`btn-ghost ${!setId ? "border-accent" : ""}`}>
            All sets
          </Link>
          {data.sets.map((s) => (
            <Link key={s.id} href={`/matches?set=${s.id}`} className={`btn-ghost ${setId === s.id ? "border-accent" : ""}`}>
              {s.name}
            </Link>
          ))}
        </div>
      )}
      {matches.length === 0 ? (
        <Empty>No matches yet.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
