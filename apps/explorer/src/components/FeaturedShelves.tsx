"use client";

import Link from "next/link";
import { encodeItemId } from "@/lib/catalog";
import { docsForShelf, FEATURED_SHELVES } from "@/lib/featured";
import { useCatalog } from "@/lib/useCatalog";
import { ListingFace } from "./motion/AgentAvatar";
import { SourceBadge } from "./SourceBadge";
import { TypeBadge } from "./TypeBadge";

export function FeaturedShelves({
  heading = "From the seed",
  title = "Curated shelves — real rows only",
}: {
  heading?: string;
  title?: string;
}) {
  const { catalog, error } = useCatalog();

  if (error) return null;
  if (!catalog) return <ShelfSkeleton />;

  const shelves = FEATURED_SHELVES.map((shelf) => ({
    ...shelf,
    docs: docsForShelf(catalog.docs, shelf.source),
    total: catalog.manifest.sources[shelf.source] ?? 0,
  })).filter((shelf) => shelf.docs.length > 0);

  if (shelves.length === 0) return null;

  return (
    <section aria-labelledby="featured-shelves-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
            {heading}
          </p>
          <h2
            id="featured-shelves-heading"
            className="font-display mt-2 text-2xl font-semibold text-paper sm:text-3xl"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-mute">
          Official marketplace, template directory, and skills.sh — only listings
          already in this seed. Nothing is invented to fill a shelf.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {shelves.map((shelf) => (
          <div
            key={shelf.id}
            className="flex flex-col rounded-2xl border border-line bg-panel/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-medium text-paper">{shelf.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-mute">{shelf.blurb}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-mute">
                {shelf.total}
              </span>
            </div>
            <ul className="mt-4 flex flex-1 flex-col gap-2">
              {shelf.docs.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/item/${encodeItemId(doc.id)}`}
                    className="flex items-start gap-2.5 rounded-xl border border-transparent px-2 py-2 hover:border-line hover:bg-ink/50"
                  >
                    <ListingFace doc={doc} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge type={doc.type} />
                        <SourceBadge source={doc.source} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-paper">{doc.name}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/explore?source=${encodeURIComponent(shelf.source)}`}
              className="mt-3 inline-flex font-mono text-[11px] uppercase tracking-wider text-brass hover:underline"
            >
              Browse {shelf.source} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShelfSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="h-64 animate-pulse rounded-2xl border border-line bg-panel/50"
        />
      ))}
    </div>
  );
}
