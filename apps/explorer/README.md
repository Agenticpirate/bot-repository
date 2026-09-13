# Archive explorer

Client-side search UI for [Agenticpirate/bot-repository](https://github.com/Agenticpirate/bot-repository).

This app is a **research mirror**. Canonical pages live on the source sites. Results are real `catalog.json` rows (or published metas such as Agent Hunt). The explorer never invents serials and never strips attribution.

It does **not** need the ~2TB `sources/` tree to run or deploy. Search uses a slim index under `public/index/`.

## Run locally

```bash
cd apps/explorer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A committed **seed index** (~4.5k real rows) loads immediately.

`/` focuses the search box. Filter by type (skill / soul / bot / team / workflow and more), source, and tags when present. Open a result for title, description, source badge, original URL, and a markdown/JSON preview when that body was bundled with the seed.

## Build the index

`catalog.json` is ~95–100 MB / 200k+ rows — do not grow it. The builder writes a lean document per row:

`id`, `name`, `type`, `source`, `url`, `description`, `tags`, `path`, `updated`

```bash
# From repo root. Needs catalog.json.
python3 scripts/build-explorer-index.py --mode seed

# Full slim index of every catalog row. Needs the archive checkout
# (catalog.json). Optional previews need local files under sources/.
python3 scripts/build-explorer-index.py --mode full --previews 0
```

Or from this directory: `npm run index` / `npm run index:full`.

| Mode | What it writes | Commit? |
| --- | --- | --- |
| `seed` (default) | Bounded real rows, 1 NDJSON shard, optional `previews.json` | Yes — so CI/demo works |
| `full` | All catalog rows, gzip NDJSON shards if large | Only if shards stay under GitHub’s 100 MB file limit |

Full builds belong on a machine that already has the archive. CI and Vercel should use the committed seed (or a separately published full index), never a checkout of `sources/`.

Output:

```
apps/explorer/public/index/manifest.json
apps/explorer/public/index/shards/seed-000.ndjson
apps/explorer/public/index/previews.json
```

Full mode writes `shards/full-*.ndjson.gz` (gitignored). The app loads whatever `manifest.json` points at.

## Architecture

- **Next.js App Router** + TypeScript + Tailwind
- **MiniSearch** in the browser (prefix + light fuzzy). Comfortable at seed size; fine for 100k–250k docs once the full shards are loaded
- Shards are NDJSON (gzip when a shard exceeds ~1.5 MB uncompressed)
- `DecompressionStream` unpacks gzip shards in modern browsers
- Detail route `/item/[id]` looks up the composite id `source::catalogId` and, if present, a bundled body preview
- Empty states stay empty — no placeholder “fake” hits

Composite ids are required because `catalog.json` ids collide across sources.

## Deploy (Vercel)

Point a Vercel project at **only** `apps/explorer`:

1. New project → this GitHub repo
2. **Root Directory:** `apps/explorer`
3. Framework: Next.js (see `vercel.json`)
4. Do **not** set the build context to the whole monorepo / `sources/` tree
5. Leave the committed seed in `public/index/` so the build does not need `catalog.json`

To serve a full 200k+ index, generate shards on a machine with the archive, keep each file under GitHub’s limit, and commit or host them as static files next to the app. Still do not upload `sources/`.

## Attribution

Every card and detail page shows `source` and the original URL when the catalog row has one. Footer and detail callout repeat: this is a mirror, not the publisher of record.
