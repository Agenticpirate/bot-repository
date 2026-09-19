import { typeIcon } from "@/components/icons";
import { typeClass } from "@/lib/format";

export function TypeBadge({ type }: { type: string }) {
  const Icon = typeIcon(type);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${typeClass(type)}`}
    >
      <Icon size={10} strokeWidth={2} aria-hidden="true" />
      {type}
    </span>
  );
}
