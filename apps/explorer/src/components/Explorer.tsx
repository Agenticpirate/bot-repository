"use client";

import { Search, SearchX, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { filterDocs, searchCatalog } from "@/lib/catalog";
import { plural, typeClass } from "@/lib/format";
import { MORE_TYPES, PRIMARY_TYPES } from "@/lib/types";
import { useCatalog } from "@/lib/useCatalog";
import { useSavedIds } from "@/lib/useSaved";
import { ArchiveStats } from "./ArchiveStats";
import { FeaturedShelves } from "./FeaturedShelves";
import { ThinkingMark } from "./motion/ThinkingMark";
import { ResultCard } from "./ResultCard";
import { SourcePicker } from "./SourcePicker";

export function Explorer() {
  const { catalog, error, retry } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const savedIds = useSavedIds();

  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const source = params.get("source") ?? "";
  const tag = params.get("tag") ?? "";
  const savedOnly = params.get("saved") === "1";
  const deferredQ = useDeferredValue(q);

  const [moreOpen, setMoreOpen] = useState(
    () => Boolean(type) && !(PRIMARY_TYPES as readonly string[]).includes(type),
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
    },
    [params, router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tagName = document.activeElement?.tagName;
      if (event.key === "/" && tagName !== "INPUT" && tagName !== "TEXTAREA") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        const input = inputRef.current;
        if (!input) return;
        if (input.value) {
          event.preventDefault();
          setParam("q", "");
        } else {
          input.blur();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setParam]);

  const found = useMemo(() => {
    if (!catalog) return null;
    const filters = { q: deferredQ, type, source, tag };
    if (!savedOnly) return searchCatalog(catalog, filters);
    const saved = new Set(savedIds);
    const scoped = catalog.docs.filter((doc) => saved.has(doc.id));
    if (!deferredQ.trim()) {
      const filtered = filterDocs(scoped, filters);
      return { results: filtered.slice(0, 80), total: filtered.length };
    }
    const result = searchCatalog(catalog, filters);
    const results = result.results.filter((doc) => saved.has(doc.id));
    return { results, total: results.length };
  }, [catalog, deferredQ, type, source, tag, savedOnly, savedIds]);

  const tagOptions = useMemo(() => {
    if (!catalog) return [];
    const counts = new Map<string, number>();
    for (const doc of catalog.docs) {
      for (const item of doc.tags ?? []) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [catalog]);

  const browsing =
    !deferredQ && !type && !source && !tag && !savedOnly && (found?.total ?? 0) > 0;

  return (
    <div className="cmp-enter mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
              Compound · parts bin
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
              Pick role bots & skills
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
              Public archive of published bots, skills, SOUL.md templates, and
              workflows — plug a real listing into your memory OS. Canonical
              pages live on the source sites. This index does not invent serials.
            </p>
          </div>
          {catalog ? (
            <div className="w-full max-w-xl lg:w-[28rem]">
              <ArchiveStats manifest={catalog.manifest} compact />
            </div>
          ) : null}
        </div>
      </header>

      <div className="sticky top-14 z-20 -mx-4 border-y border-line/80 bg-ink/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <label className="group relative block">
          <span className="sr-only">Search the archive</span>
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            ref={inputRef}
            value={q}
            onChange={(event) => setParam("q", event.target.value)}
            placeholder="Search names, descriptions, tags, sources…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-line bg-panel px-10 py-3.5 text-[15px] text-paper placeholder:text-mute/70"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-mute sm:inline">
            /
          </kbd>
        </label>

        <div className="mt-3 flex flex-col gap-3">
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
              aria-expanded={moreOpen}
            >
              {moreOpen ? "Less types" : "More types"}
            </button>
            <FilterChip
              active={savedOnly}
              onClick={() => setParam("saved", savedOnly ? "" : "1")}
              label={savedIds.length ? `Saved (${savedIds.length})` : "Saved"}
              icon={<Star size={10} strokeWidth={1.75} aria-hidden="true" />}
            />
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

          {catalog ? (
            <SourcePicker
              sources={catalog.manifest.sources}
              value={source}
              onChange={(next) => setParam("source", next)}
            />
          ) : null}
        </div>
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

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-5"
        >
          <p className="font-display text-lg text-paper">Index failed to load</p>
          <p className="mt-1 text-sm text-rose-100/90">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full bg-brass px-4 py-2 text-sm font-medium text-ink"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!catalog && !error ? (
        <LoadingState />
      ) : catalog ? (
        <>
          {browsing ? (
            <FeaturedShelves
              heading="Featured in this seed"
              title="Start from known sources"
            />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wider text-mute">
              {savedOnly
                ? `${plural(found?.total ?? 0, "saved row")}`
                : deferredQ
                  ? `${plural(found?.total ?? 0, "match")} · MiniSearch`
                  : `${plural(found?.total ?? 0, "row")} · browse`}
              {found && found.results.length < found.total
                ? ` · showing ${found.results.length}`
                : ""}
            </p>
            {catalog.manifest.mode === "seed" ? (
              <p className="text-xs text-mute">
                Seed index ({catalog.manifest.indexed.toLocaleString()} rows), not
                the {catalog.manifest.catalogRows.toLocaleString()}-row catalog.
                Rebuild with{" "}
                <code className="font-mono text-brass/90">--mode full</code>.
              </p>
            ) : (
              <p className="text-xs text-mute">Searching the full committed index.</p>
            )}
          </div>

          {found && found.results.length === 0 ? (
            <EmptyState
              q={deferredQ}
              savedOnly={savedOnly}
              onClear={() => router.replace("/explore", { scroll: false })}
            />
          ) : (
            <ul className="cmp-stagger divide-y divide-line rounded-2xl border border-line bg-panel/70">
              {found?.results.map((doc) => (
                <li key={doc.id}>
                  <ResultCard doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  type,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  type?: string;
  count?: number;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 transition ${
        active
          ? type
            ? typeClass(type)
            : "bg-paper/10 text-paper ring-paper/30"
          : "text-mute ring-line hover:text-paper"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" ? (
        <span className="ml-1 opacity-60">{count}</span>
      ) : null}
    </button>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-mono text-xs text-mute">
        <ThinkingMark size="xs" label="Loading seed index" />
        Loading seed index…
      </p>
      <div className="overflow-hidden rounded-2xl border border-line">
        {[0, 1, 2, 3, 4].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse border-b border-line bg-panel/40 last:border-0"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  q,
  savedOnly,
  onClear,
}: {
  q: string;
  savedOnly: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <SearchX size={28} strokeWidth={1.5} className="mx-auto text-mute" aria-hidden="true" />
      <p className="font-display mt-3 text-xl text-paper">
        {savedOnly ? "Nothing saved matches" : "No matching archive rows"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">
        {savedOnly
          ? "Saved items live in this browser only. Star a listing to keep it here — no account."
          : q
            ? `Nothing in this seed matched “${q}”. Results are only real catalog rows — nothing is invented to fill the page.`
            : "No rows match these filters."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-brass/40"
        >
          Clear filters
        </button>
        <Link
          href="/explore?source=x.ai%2Fbot%2Fmarketplace"
          className="rounded-full bg-brass px-4 py-2 text-sm font-medium text-ink"
        >
          Browse xAI marketplace
        </Link>
      </div>
    </div>
  );
}
