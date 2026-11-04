import Link from "next/link";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { formatDate, loadLeague, pairName, sidePair } from "@/lib/league";
import { deleteMatchAction, logoutAction } from "./actions";
import { AddNameForm, LoginForm } from "./forms";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await connection();
  if (!adminConfigured()) {
    return (
      <Card title="Admin">
        <p className="text-sm text-muted">
          Admin is turned off. Add an <code>ADMIN_PASSWORD</code> environment variable in Vercel and redeploy.
        </p>
      </Card>
    );
  }
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm">
        <PageTitle>Admin sign in</PageTitle>
        <LoginForm />
      </div>
    );
  }

  const data = await loadLeague();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub="Record results and manage the league.">Admin</PageTitle>
        <div className="flex gap-2">
          <Link href="/admin/matches/new" className="btn">
            Record a match
          </Link>
          <form action={logoutAction}>
            <button className="btn-ghost h-full">Sign out</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Players (${data.players.length})`}>
          <p className="mb-3 text-sm text-muted">{data.players.map((p) => p.name).join(", ")}</p>
          <AddNameForm kind="player" />
        </Card>
        <Card title={`Sets (${data.sets.length})`}>
          <p className="mb-3 text-sm text-muted">{data.sets.map((s) => s.name).join(", ") || "None yet"}</p>
          <AddNameForm kind="set" />
        </Card>
      </div>

      <Card title="Matches">
        <ul className="divide-y divide-line/60 text-sm">
          {data.matches.map((m) => {
            const a = sidePair(m, "A");
            const b = sidePair(m, "B");
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/matches/${m.id}`} className="hover:underline">
                  <span className="text-muted">{formatDate(m.playedOn)}</span> · {a ? pairName(a) : "?"}{" "}
                  <span className="num font-semibold">
                    {m.score.A}-{m.score.B}
                  </span>{" "}
                  {b ? pairName(b) : "?"}
                </Link>
                <form action={deleteMatchAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-xs text-loss hover:underline">Delete</button>
                </form>
              </li>
            );
          })}
          {data.matches.length === 0 && <li className="py-4 text-muted">No matches yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
