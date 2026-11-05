"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  addPlayerAction,
  createMatchAction,
  loginAction,
  updateMatchAction,
  type ActionResult,
} from "./actions";
import { CardSearch } from "./card-search";
import { SetPicker } from "./set-picker";

function Message({ state }: { state: ActionResult }) {
  if (state?.error) return <p className="text-sm text-loss">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-win">{state.ok}</p>;
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="password" type="password" placeholder="Admin password" className="field" autoFocus required />
      <Message state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

export function AddPlayerForm() {
  const [state, action, pending] = useActionState(addPlayerAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="name" placeholder="Player name" className="field" required />
        <button className="btn shrink-0" disabled={pending}>
          Add
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

const COLORS = [
  { c: "W", label: "White", cls: "peer-checked:bg-[#f4efd0] peer-checked:text-[#3b3520]" },
  { c: "U", label: "Blue", cls: "peer-checked:bg-[#2a7fc6] peer-checked:text-white" },
  { c: "B", label: "Black", cls: "peer-checked:bg-[#3a3134] peer-checked:text-white peer-checked:ring-1 peer-checked:ring-[#8a7f83]" },
  { c: "R", label: "Red", cls: "peer-checked:bg-[#d8423a] peer-checked:text-white" },
  { c: "G", label: "Green", cls: "peer-checked:bg-[#2f8a54] peer-checked:text-white" },
  { c: "C", label: "Colorless", cls: "peer-checked:bg-[#b9b1ad] peer-checked:text-[#2c2826]" },
];

type Option = { id: number; name: string };

export type CardPickInitial = { name: string; scryfallId: string | null; image: string | null; url: string | null; playerId: number | null };

/** Values to pre-fill the form with when editing a match. */
export type MatchInitial = {
  id: number;
  playedOn: string;
  setId: number | null;
  format: string | null;
  notes: string | null;
  seats: Record<"a1" | "a2" | "b1" | "b2", { playerId: number; colors: string } | undefined>;
  games: { winnerSide: string; onPlaySide: string | null; lifeA: number | null; lifeB: number | null }[];
  mvc: CardPickInitial | null;
  lvc: CardPickInitial | null;
};

function Seat({
  prefix,
  label,
  players,
  initial,
}: {
  prefix: string;
  label: string;
  players: Option[];
  initial?: { playerId: number; colors: string };
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted">{label}</label>
      <select name={`${prefix}_player`} className="field" required defaultValue={initial?.playerId ?? ""}>
        <option value="" disabled>
          Choose player
        </option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-1.5">
        {COLORS.map(({ c, label, cls }) => (
          <label key={c} title={label} className="cursor-pointer">
            <input
              type="checkbox"
              name={`${prefix}_colors`}
              value={c}
              defaultChecked={initial?.colors.includes(c)}
              className="peer sr-only"
            />
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-xs font-bold text-muted peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${cls}`}
            >
              {c}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SideToggle({ name, required, initial }: { name: string; required?: boolean; initial?: string | null }) {
  return (
    <div className="flex gap-1">
      {(["A", "B"] as const).map((s) => (
        <label key={s} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={s}
            defaultChecked={initial === s}
            className="peer sr-only"
            required={required}
          />
          <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border border-line px-2 text-xs text-muted peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-bg">
            Team {s}
          </span>
        </label>
      ))}
    </div>
  );
}

function CardPickFields({
  prefix,
  title,
  players,
  initial,
}: {
  prefix: "mvc" | "lvc";
  title: string;
  players: Option[];
  initial: CardPickInitial | null;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold">
        {title} <span className="font-normal text-muted">(optional)</span>
      </legend>
      <CardSearch prefix={prefix} initial={initial} />
      <div>
        <label className="mb-1 block text-xs text-muted">Played by</label>
        <select name={`${prefix}PlayerId`} className="field" defaultValue={initial?.playerId ?? ""}>
          <option value="">–</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

export function MatchForm({
  players,
  sets,
  today,
  defaultSetName,
  initial,
}: {
  players: Option[];
  sets: (Option & { code: string | null })[];
  today: string;
  defaultSetName: string;
  initial?: MatchInitial;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function clearGame(n: number) {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLInputElement>(`input[name^="g${n}_"]`).forEach((input) => {
      if (input.type === "radio") input.checked = false;
      else input.value = "";
    });
  }

  return (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(undefined);
        startTransition(async () => {
          const res = await (initial ? updateMatchAction(fd) : createMatchAction(fd));
          if (res?.error) setError(res.error);
        });
      }}
    >
      {initial && <input type="hidden" name="matchId" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Date</label>
          <input type="date" name="playedOn" defaultValue={initial?.playedOn ?? today} className="field" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Set</label>
          <SetPicker
            leagueSets={sets.filter((x) => x.code).map((x) => ({ name: x.name, code: x.code! }))}
            initialName={initial ? (sets.find((x) => x.id === initial.setId)?.name ?? "") : defaultSetName}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Format</label>
          <select name="format" className="field" defaultValue={initial ? (initial.format ?? "other") : "draft"}>
            <option value="draft">Draft</option>
            <option value="sealed">Sealed</option>
            <option value="constructed">Constructed</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["a", "b"] as const).map((t) => (
          <fieldset key={t} className="space-y-4 rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">Team {t.toUpperCase()}</legend>
            <Seat prefix={`${t}1`} label="Player 1 and deck colors" players={players} initial={initial?.seats[`${t}1`]} />
            <Seat prefix={`${t}2`} label="Player 2 and deck colors" players={players} initial={initial?.seats[`${t}2`]} />
          </fieldset>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Games</h3>
        <p className="text-xs text-muted">Life is each team&apos;s shared total when the game ended (2HG starts at 30).</p>
        {[1, 2, 3].map((n) => (
          <div key={n} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[5rem_1fr_1fr_6rem_6rem]">
            <div className="text-sm font-semibold">
              Game {n}
              {n === 3 && (
                <div className="text-xs font-normal text-muted">
                  if needed ·{" "}
                  <button type="button" onClick={() => clearGame(3)} className="underline hover:text-text">
                    clear
                  </button>
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Winner</div>
              <SideToggle name={`g${n}_winner`} required={n < 3} initial={initial?.games[n - 1]?.winnerSide} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">On the play</div>
              <SideToggle name={`g${n}_onPlay`} initial={initial?.games[n - 1]?.onPlaySide} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Team A life</div>
              <input name={`g${n}_lifeA`} defaultValue={initial?.games[n - 1]?.lifeA ?? ""} type="number" min={-999} max={999} className="field" inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Team B life</div>
              <input name={`g${n}_lifeB`} defaultValue={initial?.games[n - 1]?.lifeB ?? ""} type="number" min={-999} max={999} className="field" inputMode="numeric" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CardPickFields prefix="mvc" title="MVC: Most Valuable Card" players={players} initial={initial?.mvc ?? null} />
        <CardPickFields prefix="lvc" title="LVC: Least Valuable Card" players={players} initial={initial?.lvc ?? null} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">Notes</label>
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="field" placeholder="Big plays, trash talk…" />
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : initial ? "Save changes" : "Save match"}
      </button>
    </form>
  );
}
