export type IndexDoc = {
  id: string;
  name: string;
  type: string;
  source: string;
  url: string;
  description?: string;
  tags?: string[];
  path?: string;
  updated?: string;
};

export type ShardRef = {
  file: string;
  count: number;
  bytes: number;
  encoding: "identity" | "gzip";
};

export type IndexManifest = {
  generatedAt: string;
  mode: "seed" | "full";
  catalogRows: number;
  indexed: number;
  skipped?: number;
  fields: string[];
  shards: ShardRef[];
  previews: string | null;
  previewCount: number;
  types: Record<string, number>;
  sources: Record<string, number>;
  attribution: string;
  seedNote?: string;
};

export type BodyPreview = {
  kind: "markdown" | "json" | "text";
  text: string;
  path: string;
};

export const PRIMARY_TYPES = [
  "skill",
  "soul",
  "bot",
  "team",
  "workflow",
] as const;

export const MORE_TYPES = [
  "agent",
  "plugin",
  "job",
  "mcp",
  "template",
  "listing",
  "page",
  "pack",
  "file",
] as const;
