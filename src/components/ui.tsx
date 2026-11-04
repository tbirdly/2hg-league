import Link from "next/link";
import type { ReactNode } from "react";
import {
  colorComboName,
  firstName,
  fmtPct,
  formatDate,
  pct,
  type FullMatch,
  type Record_,
  type Side,
} from "@/lib/league";

const PIP_STYLES: Record<string, string> = {
  W: "bg-[#f4efd0] text-[#3b3520]",
  U: "bg-[#2a7fc6] text-white",
  B: "bg-[#3a3134] text-[#e4dcd8] ring-1 ring-[#6a5f63]",
  R: "bg-[#d8423a] text-white",
  G: "bg-[#2f8a54] text-white",
  C: "bg-[#b9b1ad] text-[#2c2826]",
};

export function Pips({ colors, size = "sm" }: { colors: string; size?: "sm" | "md" }) {
  if (!colors) return <span className="text-xs text-muted">–</span>;
  const dim = size === "md" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]";
  return (
    <span className="inline-flex gap-0.5 align-middle" title={colorComboName(colors)}>
      {colors.split("").map((c, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center rounded-full font-bold ${dim} ${PIP_STYLES[c] ?? ""}`}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card">
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export function Streak({ value }: { value: string }) {
  if (!value) return <span className="text-muted">–</span>;
  return <span className={value.startsWith("W") ? "text-win" : "text-loss"}>{value}</span>;
}

export function RecordCells({ r }: { r: Record_ }) {
  return (
    <>
      <td className="num px-2 py-2 text-right">{r.matchesPlayed}</td>
      <td className="num px-2 py-2 text-right">
        {r.matchWins}-{r.matchLosses}
      </td>
      <td className="num hidden px-2 py-2 text-right sm:table-cell">
        {r.gameWins}-{r.gameLosses}
      </td>
      <td className="num hidden px-2 py-2 text-right sm:table-cell">{fmtPct(pct(r.gameWins, r.gameLosses))}</td>
      <td className="num px-2 py-2 text-right">
        <Streak value={r.streak} />
      </td>
      <td className="num px-2 py-2 text-right font-semibold text-accent">{r.points}</td>
    </>
  );
}

export function RecordHead({ first }: { first: string }) {
  return (
    <thead>
      <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
        <th className="w-8 px-2 py-2">#</th>
        <th className="px-2 py-2">{first}</th>
        <th className="px-2 py-2 text-right" title="Matches played">MP</th>
        <th className="px-2 py-2 text-right" title="Match wins-losses">W-L</th>
        <th className="hidden px-2 py-2 text-right sm:table-cell" title="Game wins-losses">Games</th>
        <th className="hidden px-2 py-2 text-right sm:table-cell" title="Game win %">GW%</th>
        <th className="px-2 py-2 text-right">Streak</th>
        <th className="px-2 py-2 text-right" title="3 points per match win">Pts</th>
      </tr>
    </thead>
  );
}

function SideLine({ m, side, compact }: { m: FullMatch; side: Side; compact?: boolean }) {
  const won = m.winner === side;
  return (
    <div className={`flex items-center justify-between gap-3 ${won ? "" : "opacity-70"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {m.sides[side].map((s) => (
          <span key={s.player.id} className="inline-flex items-center gap-1.5">
            <span className={won ? "font-semibold" : ""}>{compact ? firstName(s.player.name) : s.player.name}</span>
            <Pips colors={s.colors} />
          </span>
        ))}
      </div>
      <span className={`num text-lg font-bold ${won ? "text-win" : "text-muted"}`}>{m.score[side]}</span>
    </div>
  );
}

export function MatchCard({ m }: { m: FullMatch }) {
  return (
    <div className="relative rounded-lg border border-line bg-card-2/40 p-3 transition hover:border-accent/60">
      <Link href={`/matches/${m.id}`} className="absolute inset-0 rounded-lg" aria-label={`Match on ${formatDate(m.playedOn)}`} />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{formatDate(m.playedOn)}</span>
        <span>
          {[m.set?.name, m.format].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="space-y-1.5 text-sm">
        <SideLine m={m} side="A" compact />
        <SideLine m={m} side="B" compact />
      </div>
      {m.mvp && (
        <div className="mt-2 truncate text-xs text-muted">
          MVP: <span className="text-accent">{m.mvp.name}</span>
          {m.mvp.player && ` (${firstName(m.mvp.player.name)})`}
        </div>
      )}
    </div>
  );
}

export function CardImage({ name, image, url, className = "w-56" }: { name: string; image: string | null; url: string | null; className?: string }) {
  const inner = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} className={`rounded-[4.5%/3.2%] shadow-lg ${className}`} loading="lazy" />
  ) : (
    <div className={`flex aspect-[488/680] items-center justify-center rounded-lg border border-line bg-card-2 p-3 text-center text-sm font-semibold ${className}`}>
      {name}
    </div>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" title={`${name} on Scryfall`}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function WinBar({ wins, played }: { wins: number; played: number }) {
  const v = played ? wins / played : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-line sm:w-40">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(v * 100)}%` }} />
      </div>
      <span className="num w-10 text-right text-sm">{fmtPct(played ? v : null)}</span>
    </div>
  );
}
