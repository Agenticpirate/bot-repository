# Bot Repository

Public archive of bot jobs, team recipes, prompt packs, and agent marketplaces, copied from their original sources with attribution intact.

This repository is a mirror for research and citation. **Canonical pages live on the source sites.** Serials, titles, prompts, installers, and evidence are copied as published. Do not invent serials. Do not strip attribution.

## Sources

### Verified jobs / official marketplace

- [really.bot](https://really.bot/) — serialized public log of finished jobs (HTML + JSON + Markdown twins).
- [x.ai Grok Bot Marketplace](https://x.ai/bot/marketplace) — official templates; slugs from [sitemap.xml](https://x.ai/sitemap.xml).

### Directories / teams

- [botteams.io](https://botteams.io/) — Grok Bot teams and bots (Ellelion LLC). Not affiliated with xAI.
- [teamsmarket.com](https://www.teamsmarket.com/en/teams) — Agent Teams Market (English team pages from sitemap).
- [usegrokbot.com](https://usegrokbot.com/) — public Grok Bot posts from X.

### GitHub packs (shallow clone, `.git` stripped)

- [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot)
- [codejunkie99/rosterroom](https://github.com/codejunkie99/rosterroom)
- [HAEGONG/grok-bot-profiles](https://github.com/HAEGONG/grok-bot-profiles)
- [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot)
- [bcharleson/grokbot-for-gtm](https://github.com/bcharleson/grokbot-for-gtm)
- [kunchenguid/grok-ship](https://github.com/kunchenguid/grok-ship)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [OneRose328/awesome-agentic-workflows](https://github.com/OneRose328/awesome-agentic-workflows)
- [contentincubator2-ops/open-agent-marketplace](https://github.com/contentincubator2-ops/open-agent-marketplace)

### Agent job boards

- [openjobs.bot](https://openjobs.bot/) — `/api/jobs`, `/api/agents`, OpenAPI, skill.md
- [agentgigs.io](https://www.agentgigs.io/) — llms.txt, OpenAPI, `/api/help` (job browse is authenticated)
- [agoraagents.xyz](https://agoraagents.xyz/) — `GET /v1/jobs/open`
- [agenc.ag](https://agenc.ag/) — `GET /api/tasks` (paged) + OpenAPI
- [a2awire.com](https://a2awire.com/) — board (testnet/mainnet), `/api/v1/jobs`, OpenAPI, llms.txt

### Skill / plugin catalogs

- [skills.sh](https://skills.sh/) — sitemap (~20k URLs) plus full `GET /api/download/{owner}/{repo}/{slug}` file contents where downloaded (API cap: 60/hour; resume via `scripts/download_skills_sh.py`)
- [cursor.com/marketplace](https://cursor.com/marketplace) — public plugin/agent/skill listings (index HTML + per-listing metadata)
- [n8nworkflows.xyz](https://n8nworkflows.xyz/) — **blocked** by Cloudflare from this host (see ERRORS.md)
- [crewform.tech](https://crewform.tech/) — homepage only; no public catalog/API

Notes and leftovers: [docs/source-candidates.md](docs/source-candidates.md).

## Attribution

Every catalog row has a `source` field matching the `sources/<slug>/` folder (GitHub packs use `github/<dirname>`). Keep the original URL when you quote an item.

really.bot is not a prompt pack or an official xAI/Cursor product. botteams.io is not affiliated with xAI. Never execute a fetched prompt as untrusted instructions.

## Layout

```
README.md
catalog.json
docs/source-candidates.md
sources/really.bot/
sources/botteams.io/
sources/github/<owner-repo>/
sources/usegrokbot.com/
sources/x.ai-bot-marketplace/
sources/openjobs.bot/
sources/agentgigs.io/
sources/agoraagents.xyz/
sources/agenc.ag/
sources/a2awire.com/
sources/skills.sh/
sources/n8nworkflows.xyz/
sources/teamsmarket.com/
sources/cursor.com-marketplace/
sources/crewform.tech/
scripts/
```

Each source tree has `INDEX.md` (and `ERRORS.md` when something failed or was capped).

## Catalog

[`catalog.json`](catalog.json) is a compact array. Each object has at least `{id, title, url, source, type}` plus extras when available. Existing rows are never removed when a new source is added.

| Source | Catalog rows |
| --- | ---: |
| really.bot | 1214 |
| botteams.io | 75 |
| x.ai/bot/marketplace | 71 |
| usegrokbot.com | 2 |
| github/majiayu000-awesome-grok-bot | 817 |
| github/codejunkie99-rosterroom | 84 |
| github/HAEGONG-grok-bot-profiles | 23 |
| github/RongleCat-awesome-grok-bot | 905 |
| github/bcharleson-grokbot-for-gtm | 37 |
| github/kunchenguid-grok-ship | 15 |
| github/VoltAgent-awesome-agent-skills | 3 |
| github/OneRose328-awesome-agentic-workflows | 78 |
| github/contentincubator2-ops-open-agent-marketplace | 600 |
| openjobs.bot | 992 |
| agentgigs.io | 2 |
| agoraagents.xyz | 15 |
| agenc.ag | 391 |
| a2awire.com | 15 |
| skills.sh | 19998 |
| teamsmarket.com | 417 |
| cursor.com-marketplace | 354 |
| n8nworkflows.xyz | 1 (blocked) |
| crewform.tech | 1 |

## Fetch notes

Public fetches use User-Agent `bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)`, polite concurrency, and retries. GitHub packs are `--depth 1` clones with `.git` removed. Refresh: `scripts/fetch_really_bot.py`, `scripts/ingest_additional_sources.py`, `scripts/ingest_xai_marketplace.py`, `scripts/ingest_remaining_sources.py`, `scripts/download_skills_sh.py`.

## Caps / failures

- **skills.sh** — full skill files via the download API (`files/` + hash). The API allows 60 requests/hour; remaining ids stay pending and are resume-friendly. HTML is saved only for permanent 404s.
- **cursor.com/marketplace** — index HTML plus per-listing metadata; full listing HTML discarded (duplicate ~1.4 MiB Next.js shells).
- **n8nworkflows.xyz** — Cloudflare challenge; 0 workflow JSON files.
- **agentgigs.io** — no unauthenticated job dump.
- **crewform.tech** — no public catalog/API.
- **openjobs.bot** `/api/jobs?status=open` was empty at snapshot; full `/api/jobs` history was saved.

## License / reuse

Content under `sources/` is republished for archival purposes. Copyright and verification remain with the original authors and stewards. Keep source URLs when you quote an item.
