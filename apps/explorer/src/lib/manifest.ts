import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IndexManifest } from "./types";

export async function readManifest(): Promise<IndexManifest> {
  const raw = await readFile(
    path.join(process.cwd(), "public/index/manifest.json"),
    "utf8",
  );
  return JSON.parse(raw) as IndexManifest;
}

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
