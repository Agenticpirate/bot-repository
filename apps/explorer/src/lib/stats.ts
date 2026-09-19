import type { IndexManifest } from "./types";

export function sourceCount(manifest: IndexManifest): number {
  return Object.keys(manifest.sources).length;
}

export function typeCount(manifest: IndexManifest): number {
  return Object.keys(manifest.types).length;
}

export function popularSources(
  sources: Record<string, number>,
  limit = 8,
): [string, number][] {
  return Object.entries(sources)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

export function topTypes(
  types: Record<string, number>,
  limit = 4,
): [string, number][] {
  return Object.entries(types)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}
