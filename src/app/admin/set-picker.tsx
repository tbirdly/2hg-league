"use client";

import { useEffect, useState } from "react";

type ScryfallSet = { name: string; code: string; set_type: string; released_at?: string; digital: boolean };
type SetOption = { name: string; code: string | null; released: string | null };

// Paper sets people actually play limited/constructed with.
const SET_TYPES = new Set(["core", "expansion", "masters", "draft_innovation", "commander", "funny"]);

/**
 * Set name box that suggests every Scryfall set (newest first) plus the league's own sets.
 * Submits setName and, when the name matches a Scryfall set, its setCode. A custom name is allowed.
 */
export function SetPicker({ leagueSets, initialName }: { leagueSets: string[]; initialName: string }) {
  const [value, setValue] = useState(initialName);
  const [scryfall, setScryfall] = useState<SetOption[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.scryfall.com/sets", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: { data?: ScryfallSet[] }) => {
        const sets = (json.data ?? [])
          .filter((s) => !s.digital && SET_TYPES.has(s.set_type))
          .map((s) => ({ name: s.name, code: s.code.toUpperCase(), released: s.released_at ?? null }))
          .sort((a, b) => (b.released ?? "").localeCompare(a.released ?? ""));
        setScryfall(sets);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const byName = new Map(scryfall.map((s) => [s.name.toLowerCase(), s]));
  const match = byName.get(value.trim().toLowerCase());
  const extra = leagueSets.filter((n) => !byName.has(n.toLowerCase()));

  return (
    <div>
      <input
        aria-label="Set"
        list="set-options"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder="Start typing a set"
        className="field"
        autoComplete="off"
      />
      {/* Save Scryfall's exact spelling when the typed name matches one of its sets. */}
      <input type="hidden" name="setName" value={match?.name ?? value.trim()} />
      <input type="hidden" name="setCode" value={match?.code ?? ""} />
      <datalist id="set-options">
        {extra.map((n) => (
          <option key={`league-${n}`} value={n} />
        ))}
        {scryfall.map((s) => (
          <option key={s.code} value={s.name}>
            {s.code}
            {s.released ? ` · ${s.released.slice(0, 4)}` : ""}
          </option>
        ))}
      </datalist>
      <p className="mt-1 text-xs text-muted">
        {failed
          ? "Couldn't load Scryfall's set list. Type the set name."
          : match
            ? `${match.code}${match.released ? ` · released ${match.released}` : ""}`
            : value.trim()
              ? "Not a Scryfall set. It will be saved as typed."
              : "Sets from Scryfall."}
      </p>
    </div>
  );
}
