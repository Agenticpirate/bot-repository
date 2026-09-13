"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  loadCatalog,
  searchCatalog,
  encodeItemId,
  type Catalog,
} from "@/lib/catalog";
import { formatDate, hostOf, plural, sourceHue, typeClass } from "@/lib/format";
import { MORE_TYPES, PRIMARY_TYPES, type IndexDoc } from "@/lib/types";

function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((value) => {
        if (!cancelled) setCatalog(value);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load index");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { catalog, error };
}

export function Explorer() {
  const { catalog, error } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const source = params.get("source") ?? "";
  const tag = params.get("tag") ?? "";
  const deferredQ = useDeferredValue(q);

  const [sourceQuery, setSourceQuery] = useState(source);
  const [sourceFromUrl, setSourceFromUrl] = useState(source);
  if (source !== sourceFromUrl) {
    setSourceFromUrl(source);
    setSourceQuery(source);
  }
  const [moreOpen, setMoreOpen] = useState(
    () => Boolean(type) && !(PRIMARY_TYPES as readonly string[]).includes(type),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  const found = useMemo(() => {
    if (!catalog) return null;
    return searchCatalog(catalog, { q: deferredQ, type, source, tag });
  }, [catalog, deferredQ, type, source, tag]);

  const sourceOptions = useMemo(() => {
    if (!catalog) return [];
    const qLower = sourceQuery.trim().toLowerCase();
    return Object.entries(catalog.manifest.sources)
      .filter(([name]) => !qLower || name.toLowerCase().includes(qLower))
      .slice(0, 18);
  }, [catalog, sourceQuery]);

  const tagOptions = useMemo(() => {
    if (!catalog) return [];
    const counts = new Map<string, number>();
    for (const doc of catalog.docs) {
      for (const item of doc.tags ?? []) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [catalog]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
              Agenticpirate / bot-repository
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
              Archive explorer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
              Search a research mirror of bots, skills, SOUL.md templates,
              workflows, and marketplace listings. Canonical pages live on the
              source sites — this index does not invent serials.
            </p>
          </div>
          {catalog ? (
            <div className="font-mono text-right text-[11px] leading-5 text-mute">
              <div>
                {catalog.manifest.mode === "seed" ? "Seed index" : "Full index"}
              </div>
              <div>
                {plural(catalog.manifest.indexed, "row")}
                {catalog.manifest.mode === "seed"
                  ? ` · catalog ${catalog.manifest.catalogRows.toLocaleString()}`
                  : ""}
              </div>
              <div>{new Date(catalog.manifest.generatedAt).toISOString().slice(0, 10)}</div>
            </div>
          ) : null}
        </div>

        <label className="group relative block">
          <span className="sr-only">Search the archive</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-mute">
            /
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(event) => setParam("q", event.target.value)}
            placeholder="Search names, descriptions, tags, sources…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-line bg-panel px-10 py-3.5 text-[15px] text-paper outline-none ring-brass/0 transition placeholder:text-mute/70 focus:border-brass/50 focus:ring-4 focus:ring-brass/15"
          />
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={!type}
              onClick={() => setParam("type", "")}
              label="All types"
            />
            {PRIMARY_TYPES.map((item) => (
              <FilterChip
                key={item}
                active={type === item}
                onClick={() => setParam("type", type === item ? "" : item)}
                label={item}
                type={item}
                count={catalog?.manifest.types[item]}
              />
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="rounded-full px-2.5 py-1 font-mono text-[11px] text-mute hover:text-paper"
            >
              {moreOpen ? "Less" : "More types"}
            </button>
          </div>
          {moreOpen ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {MORE_TYPES.map((item) => (
                <FilterChip
                  key={item}
                  active={type === item}
                  onClick={() => setParam("type", type === item ? "" : item)}
                  label={item}
                  type={item}
                  count={catalog?.manifest.types[item]}
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <input
                value={sourceQuery}
                onChange={(event) => {
                  setSourceQuery(event.target.value);
                  if (!event.target.value) setParam("source", "");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && sourceOptions[0]) {
                    setParam("source", sourceOptions[0][0]);
                  }
                }}
                placeholder="Filter by source (skills.sh, clawhub.ai, x.ai…)"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-paper outline-none focus:border-brass/50"
              />
              {sourceQuery && sourceQuery !== source ? (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-ink py-1 shadow-2xl">
                  {sourceOptions.map(([name, count]) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => {
                          setParam("source", name);
                          setSourceQuery(name);
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-panel"
                      >
                        <span className="truncate" style={{ color: sourceHue(name) }}>
                          {name}
                        </span>
                        <span className="font-mono text-[11px] text-mute">
                          {count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {source ? (
              <button
                type="button"
                onClick={() => {
                  setParam("source", "");
                  setSourceQuery("");
                }}
                className="justify-self-start rounded-xl border border-line px-3 py-2 text-xs text-mute hover:text-paper"
              >
                Clear source
              </button>
            ) : null}
          </div>

          {tagOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-mute">
                Tags
              </span>
              {tagOptions.map(([item, count]) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setParam("tag", tag === item ? "" : item)}
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ring-1 ${
                    tag === item
                      ? "bg-brass/20 text-brass ring-brass/40"
                      : "text-mute ring-line hover:text-paper"
                  }`}
                >
                  {item}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!catalog ? (
        <p className="font-mono text-xs text-mute">Loading seed index…</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-mute">
              {deferredQ
                ? `${plural(found?.total ?? 0, "match")} · MiniSearch`
                : `${plural(found?.total ?? 0, "row")} · browse`}
            </p>
            {catalog.manifest.mode === "seed" ? (
              <p className="text-xs text-mute">
                Seed only — rebuild with{" "}
                <code className="font-mono text-brass/90">--mode full</code> for
                the complete catalog.
              </p>
            ) : null}
          </div>

          {found && found.results.length === 0 ? (
            <EmptyState q={deferredQ} />
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-panel/70">
              {found?.results.map((doc) => (
                <li key={doc.id}>
                  <ResultCard doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  type,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  type?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 transition ${
        active
          ? type
            ? typeClass(type)
            : "bg-paper/10 text-paper ring-paper/30"
          : "text-mute ring-line hover:text-paper"
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span className="ml-1 opacity-60">{count}</span>
      ) : null}
    </button>
  );
}

function ResultCard({ doc }: { doc: IndexDoc }) {
  return (
    <Link
      href={`/item/${encodeItemId(doc.id)}`}
      className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-paper/[0.03] sm:flex-row sm:items-start sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${typeClass(doc.type)}`}
          >
            {doc.type}
          </span>
          <span
            className="truncate font-mono text-[11px]"
            style={{ color: sourceHue(doc.source) }}
          >
            {doc.source}
          </span>
          {doc.updated ? (
            <span className="font-mono text-[10px] text-mute">
              {formatDate(doc.updated)}
            </span>
          ) : null}
        </div>
        <h2 className="text-[15px] font-medium leading-snug text-paper">
          {doc.name}
        </h2>
        {doc.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-mute">
            {doc.description}
          </p>
        ) : null}
        {doc.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {doc.tags.map((item) => (
              <span
                key={item}
                className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-mute"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 shrink-0 sm:max-w-[220px] sm:text-right">
        {doc.url ? (
          <span className="block truncate font-mono text-[11px] text-brass/90">
            {hostOf(doc.url)}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-mute">No original URL</span>
        )}
        {doc.path ? (
          <span className="mt-1 block truncate font-mono text-[10px] text-mute">
            {doc.path}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-xl text-paper">No matching archive rows</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">
        {q
          ? `Nothing in this seed matched “${q}”. Results are only real catalog rows — nothing is invented to fill the page.`
          : "No rows match these filters."}
      </p>
    </div>
  );
}
