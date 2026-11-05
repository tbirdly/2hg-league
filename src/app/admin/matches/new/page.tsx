import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { loadLeague } from "@/lib/league";
import { MatchForm } from "../../forms";

export const metadata = { title: "Record a match" };

export default async function NewMatchPage() {
  await connection();
  if (!(await isAdmin())) redirect("/admin");
  const data = await loadLeague();
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
        />
      </Card>
    </div>
  );
}
