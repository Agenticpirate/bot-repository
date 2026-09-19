import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bot,
  Briefcase,
  Cable,
  CircleUser,
  File,
  FileText,
  LayoutTemplate,
  Package,
  Puzzle,
  ScanFace,
  Sparkles,
  Store,
  Users,
  Workflow,
} from "lucide-react";

export function UiIcon({
  icon: Icon,
  size = 16,
  className,
  label,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  skill: Sparkles,
  soul: ScanFace,
  bot: Bot,
  team: Users,
  workflow: Workflow,
  agent: Bot,
  plugin: Puzzle,
  job: Briefcase,
  mcp: Cable,
  template: LayoutTemplate,
  listing: Store,
  page: FileText,
  pack: Package,
  file: File,
};

export function typeIcon(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? CircleUser;
}

export { Archive };
