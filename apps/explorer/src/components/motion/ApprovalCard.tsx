import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function ApprovalCard({
  title,
  body,
  primary = "Approve",
  secondary = "Decline",
  icon,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary?: string;
  secondary?: string;
  icon?: ReactNode;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink ring-1 ring-line text-brass">
          {icon ?? <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-paper">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">{body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrimary}
          className="cmp-cta rounded-full bg-brass px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-brass/90"
        >
          {primary}
        </button>
        <button
          type="button"
          onClick={onSecondary}
          className="cmp-cta rounded-full border border-line px-3.5 py-1.5 text-sm text-paper hover:border-brass/40"
        >
          {secondary}
        </button>
      </div>
    </div>
  );
}
