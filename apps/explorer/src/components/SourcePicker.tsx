"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { popularSources } from "@/lib/manifest";
import { sourceHue } from "@/lib/format";

export function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: Record<string, number>;
  value: string;
  onChange: (source: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const popular = useMemo(() => popularSources(sources, 8), [sources]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(sources)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 60);
  }, [sources, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-mute">
          Sources
        </span>
        {popular.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(value === name ? "" : name)}
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 transition ${
              value === name
                ? "bg-brass/20 text-brass ring-brass/40"
                : "text-mute ring-line hover:text-paper"
            }`}
          >
            <span className="max-w-[10rem] truncate">{name}</span>
            <span className="ml-1 opacity-60">{count}</span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="rounded-full px-2.5 py-1 font-mono text-[11px] text-brass ring-1 ring-brass/30 hover:bg-brass/10"
        >
          {open ? "Close picker" : "All sources"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full px-2.5 py-1 font-mono text-[11px] text-mute hover:text-paper"
          >
            Clear source
          </button>
        ) : null}
      </div>

      {value && !popular.some(([name]) => name === value) ? (
        <p className="font-mono text-[11px] text-paper">
          Filtered to{" "}
          <span style={{ color: sourceHue(value) }}>{value}</span>
        </p>
      ) : null}

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filter by source"
          className="rounded-2xl border border-line bg-ink p-3 shadow-2xl"
        >
          <label className="block">
            <span className="sr-only">Search sources</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) {
                  event.preventDefault();
                  select(matches[0][0]);
                }
              }}
              placeholder={`Search ${Object.keys(sources).length} sources — Enter selects the first match`}
              className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-paper placeholder:text-mute/70"
            />
          </label>
          <ul
            role="listbox"
            className="mt-2 max-h-64 overflow-auto"
            aria-label="Matching sources"
          >
            {matches.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-mute">
                No source name matches “{query}”.
              </li>
            ) : (
              matches.map(([name, count]) => (
                <li key={name} role="option" aria-selected={value === name}>
                  <button
                    type="button"
                    onClick={() => select(name)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel ${
                      value === name ? "bg-panel" : ""
                    }`}
                  >
                    <span className="truncate" style={{ color: sourceHue(name) }}>
                      {name}
                    </span>
                    <span className="font-mono text-[11px] text-mute">{count}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
