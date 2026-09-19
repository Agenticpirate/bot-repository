import { typeClass } from "@/lib/format";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${typeClass(type)}`}
    >
      {type}
    </span>
  );
}
