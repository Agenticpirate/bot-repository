import Link from "next/link";
import { encodeItemId } from "@/lib/catalog";
import { formatDate, hostOf } from "@/lib/format";
import type { IndexDoc } from "@/lib/types";
import { ListingFace } from "./motion/AgentAvatar";
import { SavedButton } from "./SavedButton";
import { SourceBadge } from "./SourceBadge";
import { TypeBadge } from "./TypeBadge";

export function ResultCard({ doc }: { doc: IndexDoc }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-paper/[0.03] sm:flex-row sm:items-start sm:gap-4">
      <div className="hidden shrink-0 pt-0.5 sm:block">
        <ListingFace doc={doc} size="sm" />
      </div>
      <Link
        href={`/item/${encodeItemId(doc.id)}`}
        className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={doc.type} />
          <SourceBadge source={doc.source} />
          {doc.updated ? (
            <span className="font-mono text-[10px] text-mute">
              {formatDate(doc.updated)}
            </span>
          ) : null}
        </div>
        <h2 className="text-[15px] font-medium leading-snug text-paper">{doc.name}</h2>
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
      </Link>
      <div className="flex shrink-0 items-start justify-between gap-3 sm:max-w-[220px] sm:flex-col sm:items-end">
        <div className="min-w-0 sm:text-right">
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
        <SavedButton id={doc.id} compact />
      </div>
    </div>
  );
}
