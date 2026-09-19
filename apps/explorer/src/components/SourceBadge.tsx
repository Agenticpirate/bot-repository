import { sourceHue } from "@/lib/format";

export function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className="truncate font-mono text-[11px]"
      style={{ color: sourceHue(source) }}
      title={source}
    >
      {source}
    </span>
  );
}
