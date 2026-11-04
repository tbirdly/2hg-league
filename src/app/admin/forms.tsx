"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addPlayerAction,
  addSetAction,
  createMatchAction,
  loginAction,
  type ActionResult,
} from "./actions";

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

export function AddNameForm({ kind }: { kind: "player" | "set" }) {
  const [state, action, pending] = useActionState(kind === "player" ? addPlayerAction : addSetAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="name" placeholder={kind === "player" ? "Player name" : "Set name"} className="field" required />
        {kind === "set" && <input name="code" placeholder="Code" className="field w-24" maxLength={5} />}
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

function Seat({ prefix, label, players }: { prefix: string; label: string; players: Option[] }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted">{label}</label>
      <select name={`${prefix}_player`} className="field" required defaultValue="">
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
            <input type="checkbox" name={`${prefix}_colors`} value={c} className="peer sr-only" />
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

function SideToggle({ name, required }: { name: string; required?: boolean }) {
  return (
    <div className="flex gap-1">
      {(["A", "B"] as const).map((s) => (
        <label key={s} className="cursor-pointer">
          <input type="radio" name={name} value={s} className="peer sr-only" required={required} />
          <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border border-line px-2 text-xs text-muted peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-bg">
            Team {s}
          </span>
        </label>
      ))}
    </div>
  );
}

export function MatchForm({ players, sets, today }: { players: Option[]; sets: Option[]; today: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(undefined);
        startTransition(async () => {
          const res = await createMatchAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Date</label>
          <input type="date" name="playedOn" defaultValue={today} className="field" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Set</label>
          <select name="setId" className="field" defaultValue={sets[0]?.id}>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="newSet" placeholder="…or type a new set" className="field mt-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Format</label>
          <select name="format" className="field" defaultValue="draft">
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
            <Seat prefix={`${t}1`} label="Player 1 and deck colors" players={players} />
            <Seat prefix={`${t}2`} label="Player 2 and deck colors" players={players} />
          </fieldset>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Games</h3>
        {[1, 2, 3].map((n) => (
          <div key={n} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[5rem_1fr_1fr_6rem_8rem]">
            <div className="text-sm font-semibold">
              Game {n}
              {n === 3 && <div className="text-xs font-normal text-muted">if needed</div>}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Winner</div>
              <SideToggle name={`g${n}_winner`} required={n < 3} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">On the play</div>
              <SideToggle name={`g${n}_onPlay`} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Turns</div>
              <input name={`g${n}_turns`} type="number" min={1} max={99} className="field" inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Won by</div>
              <select name={`g${n}_winType`} className="field" defaultValue="">
                <option value="">–</option>
                <option value="damage">Damage</option>
                <option value="poison">Poison</option>
                <option value="mill">Mill</option>
                <option value="concede">Concede</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">Notes</label>
        <textarea name="notes" rows={2} className="field" placeholder="Big plays, trash talk…" />
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save match"}
      </button>
    </form>
  );
}
