"use client";

import { useEffect, useRef, useState } from "react";

type Picked = { id: string; name: string; image: string | null; url: string | null };

type ScryfallCard = {
  id: string;
  name: string;
  scryfall_uri?: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
};

const API = "https://api.scryfall.com";

/** Card name box with Scryfall autocomplete. Submits <prefix>CardName plus hidden Scryfall id, image and link. */
export function CardSearch({ prefix }: { prefix: "mvc" | "lvc" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [status, setStatus] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.trim().length < 2 || picked?.name === query) {
      return;
    }
    const controller = new AbortController();
    // Scryfall asks for no more than ~10 requests a second; wait for a pause in typing.
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/cards/autocomplete?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const json = (await res.json()) as { data?: string[] };
        setSuggestions(json.data?.slice(0, 8) ?? []);
        setOpen(true);
      } catch {
        /* offline or aborted: the typed name is still saved */
      }
    }, 250);
    return () => {
      clearTimeout(timer.current);
      controller.abort();
    };
  }, [query, picked]);

  async function pick(name: string) {
    setQuery(name);
    setOpen(false);
    setSuggestions([]);
    setStatus("Looking up card…");
    try {
      const res = await fetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error();
      const card = (await res.json()) as ScryfallCard;
      setPicked({
        id: card.id,
        name: card.name,
        image: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
        url: card.scryfall_uri ?? null,
      });
      setStatus(undefined);
    } catch {
      setPicked({ id: "", name, image: null, url: null });
      setStatus("Couldn't load the card image, but the name will be saved.");
    }
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <input
          name={`${prefix}CardName`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (picked && e.target.value !== picked.name) setPicked(null);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing a card name"
          className="field"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${prefix}-suggestions`}
        />
        <input type="hidden" name={`${prefix}CardScryfallId`} value={picked?.id ?? ""} />
        <input type="hidden" name={`${prefix}CardImage`} value={picked?.image ?? ""} />
        <input type="hidden" name={`${prefix}CardUrl`} value={picked?.url ?? ""} />
        {open && suggestions.length > 0 && (
          <ul
            id={`${prefix}-suggestions`}
            role="listbox"
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-card-2 py-1 text-sm shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="w-full px-3 py-1.5 text-left hover:bg-line"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
        {status && <p className="mt-1 text-xs text-muted">{status}</p>}
        <p className="mt-1 text-xs text-muted">Card data from Scryfall.</p>
      </div>
      {picked?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={picked.image} alt={picked.name} className="h-28 rounded-md" />
      )}
    </div>
  );
}
