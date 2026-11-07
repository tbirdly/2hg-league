import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, PageTitle } from "@/components/ui";
import { getDb, schema } from "@/db";
import { isAdmin } from "@/lib/auth";
import { MatchForm, type MatchInitial } from "../../../forms";

export const metadata = { title: "Edit match" };

export default async function EditMatchPage({ params }: PageProps<"/admin/matches/[id]/edit">) {
  await connection();
  if (!(await isAdmin())) redirect("/admin");
  const id = Number((await params).id);
  if (!id) notFound();

  const db = await getDb();
  const [[match], seats, games, players, sets] = await Promise.all([
    db.select().from(schema.matches).where(eq(schema.matches.id, id)),
    db.select().from(schema.matchPlayers).where(eq(schema.matchPlayers.matchId, id)).orderBy(asc(schema.matchPlayers.id)),
    db.select().from(schema.games).where(eq(schema.games.matchId, id)).orderBy(asc(schema.games.gameNumber)),
    db.select().from(schema.players).orderBy(asc(schema.players.name)),
    db.select().from(schema.sets).orderBy(asc(schema.sets.name)),
  ]);
  if (!match) notFound();

  const sideA = seats.filter((s) => s.side === "A");
  const sideB = seats.filter((s) => s.side === "B");
  const seat = (s?: (typeof seats)[number]) => (s ? { playerId: s.playerId, colors: s.colors } : undefined);
  const pick = (name: string | null, scryfallId: string | null, image: string | null, url: string | null, playerId: number | null) =>
    name ? { name, scryfallId, image, url, playerId } : null;

  const initial: MatchInitial = {
    id: match.id,
    playedOn: match.playedOn,
    setId: match.setId,
    format: match.format,
    notes: match.notes,
    seats: { a1: seat(sideA[0]), a2: seat(sideA[1]), b1: seat(sideB[0]), b2: seat(sideB[1]) },
    games: games.map((g) => ({ winnerSide: g.winnerSide, lifeA: g.lifeA, lifeB: g.lifeB })),
    mvc: pick(match.mvcCardName, match.mvcCardScryfallId, match.mvcCardImage, match.mvcCardUrl, match.mvcPlayerId),
    lvc: pick(match.lvcCardName, match.lvcCardScryfallId, match.lvcCardImage, match.lvcCardUrl, match.lvcPlayerId),
  };

  return (
    <div>
      <PageTitle sub="Change anything and save. The standings update right away.">Edit match</PageTitle>
      <Card>
        <MatchForm
          players={players.map((p) => ({ id: p.id, name: p.name }))}
          sets={sets.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
          defaultSetName=""
          today={match.playedOn}
          initial={initial}
        />
      </Card>
    </div>
  );
}
