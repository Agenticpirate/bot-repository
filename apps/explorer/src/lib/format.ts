const TYPE_COLORS: Record<string, string> = {
  skill: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  soul: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
  bot: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  team: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
  workflow: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  agent: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
  plugin: "bg-orange-400/15 text-orange-300 ring-orange-400/30",
  job: "bg-lime-400/15 text-lime-300 ring-lime-400/30",
  mcp: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  template: "bg-fuchsia-400/15 text-fuchsia-300 ring-fuchsia-400/30",
  listing: "bg-stone-400/15 text-stone-300 ring-stone-400/25",
  page: "bg-stone-400/15 text-stone-300 ring-stone-400/25",
  pack: "bg-indigo-400/15 text-indigo-300 ring-indigo-400/30",
  file: "bg-zinc-400/15 text-zinc-300 ring-zinc-400/25",
};

export function typeClass(type: string): string {
  return TYPE_COLORS[type] ?? "bg-zinc-400/15 text-zinc-300 ring-zinc-400/25";
}

export function sourceHue(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 42% 68%)`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}
