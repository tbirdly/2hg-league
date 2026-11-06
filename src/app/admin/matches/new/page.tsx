import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { loadLeague } from "@/lib/league";
import { MatchForm } from "../../forms";

export const metadata = { title: "Record a match" };

export default async function NewMatchPage({ searchParams }: PageProps<"/admin/matches/new">) {
  await connection();
  if (!(await isAdmin())) redirect("/admin");
  const data = await loadLeague();
  // Teams can be pre-filled from the Pairings page: ?a=1,2&b=3,4
  const { a, b } = await searchParams;
  const ids = (v: unknown) =>
    (typeof v === "string" ? v.split(",") : [])
      .map(Number)
      .filter((id) => data.players.some((p) => p.id === id));
  const [a1, a2] = ids(a);
  const [b1, b2] = ids(b);
  const seat = (playerId?: number) => (playerId ? { playerId, colors: "" } : undefined);
  const presetSeats = { a1: seat(a1), a2: seat(a2), b1: seat(b1), b2: seat(b2) };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return (
    <div>
      <PageTitle sub="Pick the four players, the colors each played, and who won each game.">Record a match</PageTitle>
      <Card>
        <MatchForm
          players={data.players.map((p) => ({ id: p.id, name: p.name }))}
          sets={data.sets.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
          defaultSetName={data.matches.find((m) => m.set?.code)?.set?.name ?? ""}
          today={today}
          presetSeats={presetSeats}
        />
      </Card>
    </div>
  );
}
