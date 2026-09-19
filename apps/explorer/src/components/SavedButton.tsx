"use client";

import { Star } from "lucide-react";
import { useSaved } from "@/lib/useSaved";

export function SavedButton({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const { saved, toggle } = useSaved(id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved list" : "Save to this browser"}
      title={saved ? "Saved in this browser" : "Save locally"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }}
      className={`cmp-cta inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-wider ring-1 ${
        saved
          ? "bg-brass/15 text-brass ring-brass/40"
          : "text-mute ring-line hover:text-paper hover:ring-paper/30"
      } ${compact ? "px-2 py-0.5" : "px-3 py-1.5"}`}
    >
      <Star
        size={compact ? 11 : 13}
        strokeWidth={1.75}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {compact ? null : saved ? "Saved" : "Save"}
    </button>
  );
}
