import MiniSearch, { type SearchResult } from "minisearch";
import type { BodyPreview, IndexDoc, IndexManifest, ShardRef } from "./types";

const INDEX_BASE = "/index";

let catalogPromise: Promise<Catalog> | null = null;
let previewPromise: Promise<Record<string, BodyPreview>> | null = null;

export type Catalog = {
  manifest: IndexManifest;
  docs: IndexDoc[];
  byId: Map<string, IndexDoc>;
  searcher: MiniSearch<IndexDoc>;
};

async function readShard(shard: ShardRef): Promise<IndexDoc[]> {
  const res = await fetch(`${INDEX_BASE}/${shard.file}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${shard.file} (${res.status})`);
  }

  let text: string;
  if (shard.encoding === "gzip") {
    if (!res.body) {
      throw new Error(`Empty gzip shard ${shard.file}`);
    }
    const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else {
    text = await res.text();
  }

  const docs: IndexDoc[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    docs.push(JSON.parse(line) as IndexDoc);
  }
  return docs;
}

function buildSearcher(docs: IndexDoc[]): MiniSearch<IndexDoc> {
  const searcher = new MiniSearch<IndexDoc>({
    fields: ["name", "description", "tags", "source", "type", "path"],
    storeFields: [
      "id",
      "name",
      "type",
      "source",
      "url",
      "description",
      "tags",
      "path",
      "updated",
    ],
    searchOptions: {
      boost: { name: 4, tags: 2.2, description: 1.6, source: 1.1 },
      prefix: true,
      fuzzy: 0.15,
      combineWith: "AND",
    },
    extractField(doc, fieldName) {
      const value = doc[fieldName as keyof IndexDoc];
      if (Array.isArray(value)) return value.join(" ");
      return value == null ? "" : String(value);
    },
  });
  searcher.addAll(docs);
  return searcher;
}

async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(`${INDEX_BASE}/manifest.json`);
  if (!res.ok) {
    throw new Error(`Failed to load index manifest (${res.status})`);
  }
  const manifest = (await res.json()) as IndexManifest;
  const docs: IndexDoc[] = [];
  for (const shard of manifest.shards) {
    docs.push(...(await readShard(shard)));
  }
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  return {
    manifest,
    docs,
    byId,
    searcher: buildSearcher(docs),
  };
}

export function loadCatalog(options?: { reload?: boolean }): Promise<Catalog> {
  if (options?.reload || !catalogPromise) {
    catalogPromise = fetchCatalog();
  }
  return catalogPromise;
}

export function loadPreviews(): Promise<Record<string, BodyPreview>> {
  if (!previewPromise) {
    previewPromise = fetch(`${INDEX_BASE}/previews.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return previewPromise;
}

export type QueryFilters = {
  q: string;
  type: string;
  source: string;
  tag: string;
};

export function filterDocs(docs: IndexDoc[], filters: QueryFilters): IndexDoc[] {
  const type = filters.type.trim().toLowerCase();
  const source = filters.source.trim().toLowerCase();
  const tag = filters.tag.trim().toLowerCase();
  return docs.filter((doc) => {
    if (type && doc.type !== type) return false;
    if (source && doc.source.toLowerCase() !== source) return false;
    if (tag && !(doc.tags ?? []).some((item) => item.toLowerCase() === tag)) {
      return false;
    }
    return true;
  });
}

export function searchCatalog(
  catalog: Catalog,
  filters: QueryFilters,
  limit = 80,
): { results: IndexDoc[]; total: number } {
  const filtered = filterDocs(catalog.docs, filters);
  const q = filters.q.trim();
  if (!q) {
    return { results: filtered.slice(0, limit), total: filtered.length };
  }

  const hits = catalog.searcher.search(q, {
    filter(result: SearchResult) {
      const doc = catalog.byId.get(result.id);
      if (!doc) return false;
      if (filters.type && doc.type !== filters.type) return false;
      if (
        filters.source &&
        doc.source.toLowerCase() !== filters.source.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.tag &&
        !(doc.tags ?? []).some(
          (item) => item.toLowerCase() === filters.tag.toLowerCase(),
        )
      ) {
        return false;
      }
      return true;
    },
  });

  const results = hits.slice(0, limit).map((hit) => {
    const doc = catalog.byId.get(String(hit.id));
    return doc!;
  });
  return { results, total: hits.length };
}

export function encodeItemId(id: string): string {
  return encodeURIComponent(id);
}

export function decodeItemId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
