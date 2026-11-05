"use client";

import { useEffect, useState } from "react";

type ScryfallSet = { name: string; code: string; set_type: string; released_at?: string; digital: boolean };
type SetOption = { name: string; code: string | null; released: string | null };

// Paper sets people actually play limited/constructed with.
const SET_TYPES = new Set(["core", "expansion", "masters", "draft_innovation", "commander", "funny"]);

/**
 * Set box that suggests every Scryfall paper set (newest first). Only a set from the list can be saved:
 * it submits setName and setCode. If Scryfall can't be reached, sets the league already used still work.
 */
export function SetPicker({
  leagueSets,
  initialName,
}: {
  leagueSets: { name: string; code: string }[];
  initialName: string;
}) {
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

  const known: SetOption[] = scryfall.length
    ? scryfall
    : leagueSets.map((s) => ({ name: s.name, code: s.code, released: null }));
  const byName = new Map(known.map((s) => [s.name.toLowerCase(), s]));
  const match = byName.get(value.trim().toLowerCase());
  const loading = !failed && scryfall.length === 0;
  const invalid = value.trim() !== "" && !match && !loading;

  return (
    <div>
      <input
        aria-label="Set"
        aria-invalid={invalid}
        ref={(el) => el?.setCustomValidity(invalid ? "Pick a set from the list." : "")}
        list="set-options"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder="Start typing a set"
        className="field"
        autoComplete="off"
      />
      {/* Save Scryfall's exact spelling and code for the chosen set. */}
      <input type="hidden" name="setName" value={match?.name ?? ""} />
      <input type="hidden" name="setCode" value={match?.code ?? ""} />
      <datalist id="set-options">
        {known.map((s) => (
          <option key={s.code} value={s.name}>
            {s.code}
            {s.released ? ` · ${s.released.slice(0, 4)}` : ""}
          </option>
        ))}
      </datalist>
      <p className={`mt-1 text-xs ${invalid ? "text-loss" : "text-muted"}`}>
        {match
          ? `${match.code}${match.released ? ` · released ${match.released}` : ""}`
          : loading
            ? "Loading sets from Scryfall…"
            : invalid
              ? "Pick a set from the list."
              : failed
                ? "Couldn't reach Scryfall, so only sets you've used before are listed."
                : "Sets from Scryfall."}
      </p>
    </div>
  );
}
