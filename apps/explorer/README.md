# Compound (front door) + archive explorer

This Next.js app is the web product for **[Compound](../../products/compound/)**: a Memory OS for a one-person Grok Bot company. The public archive search is the parts bin — pick real role bots and skills to plug into that OS.

| Route | Surface |
| --- | --- |
| `/` | Compound landing (problem → OS → archive → Start setup) |
| `/setup` | 12-step wizard with exact copy-paste prompts |
| `/kit` | Starter pack (Memory Steward, Who-I-Am, DECISIONS, …) |
| `/explore` | Archive search (slim index, source badges, original URLs) |
| `/item/[id]` | Listing detail + attribution + body preview when bundled |

Inspired by [KingWilliam’s article](https://x.com/kingwilliam_/status/2096273503901122746) (`@kingwilliam_`). Thesis credit only — see `products/compound/ATTRIBUTION.md`. Archive listings remain a **research mirror**; canonical pages live on the source sites. No invented serials.

The app does **not** need the ~2TB `sources/` tree. Search uses `public/index/`.

## Run locally

```bash
cd apps/explorer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A committed **seed index** (~5k real rows) loads on `/explore`.

## Product kit

Canonical kit: [`products/compound/`](../../products/compound/) (`prompts.json`, starter markdown).

Mirrored for the app (so Vercel Root Directory = `apps/explorer` still works):

```
content/compound/prompts.json
content/compound/starter/*.md
```

Keep those copies in sync when you edit the kit.

## Build the index

`catalog.json` is ~95–100 MB / 200k+ rows — do not grow it. The builder writes a lean document per row:

`id`, `name`, `type`, `source`, `url`, `description`, `tags`, `path`, `updated`

```bash
python3 scripts/build-explorer-index.py --mode seed
python3 scripts/build-explorer-index.py --mode full --previews 0
```

Or `npm run index` / `npm run index:full` from this directory.

| Mode | What it writes | Commit? |
| --- | --- | --- |
| `seed` (default) | Bounded real rows, gzip NDJSON shard, optional `previews.json` | Yes |
| `full` | All catalog rows, gzip shards if large | Only under GitHub’s 100 MB file limit |

## Architecture

- **Next.js App Router** + TypeScript + Tailwind
- **MiniSearch** in the browser for `/explore`
- Setup progress is `localStorage` only (this browser, not a backend)
- Shards are NDJSON (gzip when a shard exceeds ~1.5 MB uncompressed)

## Deploy (Vercel)

Point a Vercel project at **only** `apps/explorer`:

1. **Root Directory:** `apps/explorer`
2. Framework: Next.js (`vercel.json`)
3. Do **not** use the whole repo / `sources/` as the build context
4. Leave the committed seed in `public/index/`

## Attribution

- Compound thesis: [@kingwilliam_](https://x.com/kingwilliam_/status/2096273503901122746)
- Archive cards: `source` + original URL from `catalog.json`
- Footer and detail callouts: research mirror, not the publisher of record
