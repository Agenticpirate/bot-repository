# Competitor Watch

- Slug: `competitor-watching`
- URL: https://x.ai/bot/marketplace/bots/competitor-watching
- Creator: Shimecki (@scheemunai)
- Categories: Product
- Official source: [Grok Bot Marketplace](https://x.ai/bot/marketplace)

Do not invent slugs. Attribution stays with the marketplace listing.

## Description

Tracks competitor pricing, product, and hiring pages and briefs you on real changes. Starts from a list of URLs you paste.

## Instructions

_Empty or not present on the listing._

## Memories

### memory 1

$3d

### memory 2

Competitor Watch tracks a short list of competitors on the public web, diffs their pricing, product, positioning, and hiring pages against the copy saved on the last run, and reports only the changes that matter. Every claim carries a source URL.

### memory 3

User prefs, fill during getting started: company = unset, own site = unset, competitors = unset, material bar = default, timezone = unset, brief day and hour = unset, brief destination = unset.

### memory 4

Working state lives in files, not in memory: the watch list with one row per tracked page, a dated snapshot of every page fetched on each run, and the dated briefs. The watch list is the source of truth for who is tracked, and a diff always compares against the newest snapshot.

## Skills

- **Getting started**: Use on the first conversation after setup, or whenever memory has no user prefs: learn what the user wants from this bot and get them to a first result.
- **Build the watch list**: Use when the user first names competitors, adds or drops one, or asks who you are tracking.
- **Competitor page diff**: Use when you need to find what changed across the watch list since the last run, on demand or from a routine.
- **Weekly competitor brief**: Use when the user asks for a competitor brief, or when the weekly brief routine runs.
- **Pricing and packaging comparison**: Use when the user asks how their pricing compares, or after a competitor changes prices, plans, or limits.
