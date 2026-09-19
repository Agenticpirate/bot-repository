import { sourceCount, typeCount, topTypes } from "@/lib/manifest";
import { plural } from "@/lib/format";
import type { IndexManifest } from "@/lib/types";

export function ArchiveStats({
  manifest,
  compact = false,
}: {
  manifest: IndexManifest;
  compact?: boolean;
}) {
  const sources = sourceCount(manifest);
  const types = typeCount(manifest);
  const leading = topTypes(manifest.types, 3);

  return (
    <div
      className={`rounded-2xl border border-line bg-panel/80 ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        <span className="text-brass">
          {manifest.mode === "seed" ? "Seed index" : "Full index"}
        </span>
        <span aria-hidden="true">·</span>
        <span>{new Date(manifest.generatedAt).toISOString().slice(0, 10)}</span>
      </div>
      <dl
        className={`mt-3 grid gap-3 ${
          compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        <Stat
          value={manifest.indexed.toLocaleString()}
          label={manifest.mode === "seed" ? "rows in this seed" : "indexed rows"}
        />
        <Stat value={sources.toLocaleString()} label="sources" />
        <Stat value={types.toLocaleString()} label="types" />
        <Stat
          value={manifest.catalogRows.toLocaleString()}
          label="rows in catalog.json"
        />
      </dl>
      {!compact && leading.length > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-mute">
          {leading.map(([type, count], index) => (
            <span key={type}>
              {index > 0 ? " · " : ""}
              <span className="text-paper/80">{plural(count, type)}</span>
            </span>
          ))}
          {manifest.mode === "seed" ? (
            <>
              . This UI searches the seed, not the full catalog. Rebuild with{" "}
              <code className="font-mono text-brass/90">--mode full</code> for
              every catalog row.
            </>
          ) : (
            "."
          )}
        </p>
      ) : manifest.mode === "seed" && compact ? (
        <p className="mt-2 text-[11px] leading-relaxed text-mute">
          Seed only — not the {manifest.catalogRows.toLocaleString()}-row catalog.
          Rebuild with <code className="font-mono text-brass/90">--mode full</code>.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">
        {label}
      </dt>
      <dd className="font-display mt-0.5 text-2xl font-semibold tabular-nums text-paper">
        {value}
      </dd>
    </div>
  );
}
