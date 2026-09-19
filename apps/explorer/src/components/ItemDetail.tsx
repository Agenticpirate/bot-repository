"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeItemId, loadCatalog, loadPreviews } from "@/lib/catalog";
import { formatDate, hostOf } from "@/lib/format";
import type { BodyPreview, IndexDoc } from "@/lib/types";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ListingFace } from "./motion/AgentAvatar";
import { CopyButton } from "./CopyButton";
import { SavedButton } from "./SavedButton";
import { SourceBadge } from "./SourceBadge";
import { TypeBadge } from "./TypeBadge";

export function ItemDetail({ encodedId }: { encodedId: string }) {
  const id = decodeItemId(encodedId);
  const [catalogReady, setCatalogReady] = useState(false);
  const [doc, setDoc] = useState<IndexDoc | null | undefined>(undefined);
  const [preview, setPreview] = useState<BodyPreview | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCatalog(), loadPreviews()])
      .then(([loaded, previews]) => {
        if (cancelled) return;
        setCatalogReady(true);
        setDoc(loaded.byId.get(id) ?? null);
        setPreview(previews[id] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load item");
          setCatalogReady(true);
          setDoc(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="cmp-enter mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-brass"
        >
          <ArrowLeft size={12} strokeWidth={1.75} aria-hidden="true" />
          Archive
        </Link>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-5"
          >
            <p className="font-display text-lg text-paper">Could not load listing</p>
            <p className="mt-1 text-sm text-rose-100/90">{error}</p>
          </div>
        ) : null}

        {!catalogReady ? (
          <div className="mt-8 animate-pulse rounded-2xl border border-line bg-panel/40 px-6 py-16">
            <p className="font-mono text-xs text-mute">Loading listing…</p>
          </div>
        ) : !doc ? (
          <Missing id={id} />
        ) : (
          <Article doc={doc} preview={preview} />
        )}
      </div>
  );
}

function Missing({ id }: { id: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-12">
      <h1 className="font-display text-2xl text-paper">Not in this index</h1>
      <p className="mt-2 text-sm text-mute">
        <code className="font-mono text-brass/90">{id}</code> is not present in
        the committed seed (or loaded full index). The explorer only shows real
        catalog rows — it will not fabricate a page for a missing id.
      </p>
        <Link
        href="/explore"
        className="cmp-cta mt-5 inline-flex rounded-full bg-brass px-4 py-2 text-sm font-medium text-ink"
      >
        Back to archive
      </Link>
    </div>
  );
}

function Article({
  doc,
  preview,
}: {
  doc: IndexDoc;
  preview: BodyPreview | null | undefined;
}) {
  const sourceSite = doc.url ? hostOf(doc.url) : doc.source;

  return (
    <article className="mt-6 flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <ListingFace doc={doc} size="lg" />
        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={doc.type} />
          <SourceBadge source={doc.source} />
          {doc.updated ? (
            <span className="font-mono text-[11px] text-mute">
              Updated {formatDate(doc.updated)}
            </span>
          ) : null}
        </div>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-paper">
          {doc.name}
        </h1>
        {doc.description ? (
          <p className="mt-2 text-[15px] leading-relaxed text-mute">{doc.description}</p>
        ) : (
          <p className="mt-2 text-sm italic text-mute">
            No description was published on this catalog row.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {doc.url ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="cmp-cta inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-2 text-sm font-medium text-ink hover:bg-brass/90"
            >
              Open original source
              <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-line px-4 py-2 text-sm text-mute">
              No original URL on this row
            </span>
          )}
          <SavedButton id={doc.id} />
          <CopyButton
            getText={() => window.location.href}
            label="Copy link"
            copiedLabel="Link copied"
            tone="ghost"
          />
        </div>
        </div>
      </header>

      <aside className="rounded-2xl border border-brass/25 bg-brass/8 px-4 py-3 text-sm leading-relaxed text-paper/90">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
          Research mirror
        </p>
        <p className="mt-1">
          This page is an archive listing from{" "}
          <strong className="font-medium">{doc.source}</strong>. The canonical
          record lives on the source site
          {doc.url ? (
            <>
              {" "}
              (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
              >
                {sourceSite}
              </a>
              )
            </>
          ) : (
            ". No original URL was stored on this row."
          )}
          . Do not treat this mirror as the publisher of record.
        </p>
      </aside>

      <dl className="grid gap-3 rounded-2xl border border-line bg-panel/70 p-4 text-sm sm:grid-cols-2">
        <Field label="Archive id" value={doc.id} mono />
        <Field label="Type" value={doc.type} />
        <Field label="Source folder" value={`sources/${doc.source}`} mono />
        {doc.path ? <Field label="Local path" value={doc.path} mono /> : null}
        {doc.url ? (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">
              Original URL
            </dt>
            <dd className="mt-0.5 break-all">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-brass hover:underline"
              >
                {doc.url}
              </a>
            </dd>
          </div>
        ) : null}
        {doc.tags?.length ? (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">
              Tags / category
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {doc.tags.map((item) => (
                <Link
                  key={item}
                  href={`/explore?tag=${encodeURIComponent(item)}`}
                  className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-mute hover:text-paper"
                >
                  {item}
                </Link>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-mute">
          Body preview
        </h2>
        {preview === undefined ? (
          <p className="mt-2 font-mono text-xs text-mute">Loading preview…</p>
        ) : preview ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-ink px-3 py-1.5 font-mono text-[10px] text-mute">
              <span>{preview.path}</span>
              <span>{preview.kind}</span>
            </div>
            <pre className="max-h-[32rem] overflow-auto bg-panel/80 p-4 font-mono text-[12px] leading-relaxed text-paper/90 whitespace-pre-wrap">
              {preview.text}
            </pre>
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-mute">
            {doc.path
              ? `A local path is recorded (${doc.path}), but this seed does not bundle that file. Open the original URL, or rebuild the index on a machine with the archive checkout to attach previews.`
              : "No local body path is stored on this catalog row. Use the original URL."}
          </p>
        )}
      </section>
    </article>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">
        {label}
      </dt>
      <dd className={`mt-0.5 break-all text-paper ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
