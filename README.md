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
- [somi.ai/grok-bots](https://somi.ai/grok-bots) — sitemap grok-bot listing pages
- [grokbot.dev](https://grokbot.dev/) — JSON API (feed, templates, plugins, use-cases, collections, news) + RSS
- [grokbothq.xyz](https://grokbothq.xyz/bots) — `/api/v1/index.json` + per-bot Markdown
- [grokyard.com](https://www.grokyard.com/) — public browse of shareable Grok Bot templates
- [grokindex.dev](https://grokindex.dev/) — paginated `/api/bots`
- [gtemplate.net](https://gtemplate.net/) — sitemap bot + blog pages

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
- [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot)
- [ZeroPointRepo/GrokBotDev](https://github.com/ZeroPointRepo/GrokBotDev)
- [agent-packs/registry](https://github.com/agent-packs/registry)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [anthropics/claude-plugins-community](https://github.com/anthropics/claude-plugins-community)
- [anthropics/skills](https://github.com/anthropics/skills) — official Agent Skills
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) — official Cowork + Code role plugins
- [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal)
- [alexclowe/awesome-claude-cowork-plugins](https://github.com/alexclowe/awesome-claude-cowork-plugins)
- [anthropics/financial-services](https://github.com/anthropics/financial-services), [life-sciences](https://github.com/anthropics/life-sciences), [healthcare](https://github.com/anthropics/healthcare), [claude-tag-plugins](https://github.com/anthropics/claude-tag-plugins), [commerce-agents](https://github.com/anthropics/commerce-agents), [claude-desktop-buddy](https://github.com/anthropics/claude-desktop-buddy)
- [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code), [wshobson/agents](https://github.com/wshobson/agents), [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills), [BehiSecc/awesome-claude-skills](https://github.com/BehiSecc/awesome-claude-skills), [ccplugins/awesome-claude-code-plugins](https://github.com/ccplugins/awesome-claude-code-plugins), [abhishekray07/claude-md-templates](https://github.com/abhishekray07/claude-md-templates)
- [khendzel/awesome-agent-skills](https://github.com/khendzel/awesome-agent-skills)
- [mergisi/awesome-openclaw-agents](https://github.com/mergisi/awesome-openclaw-agents)
- [michielhdoteth/awesome-ai-agent-tools](https://github.com/michielhdoteth/awesome-ai-agent-tools)
- [difyhub/workflows](https://github.com/difyhub/workflows)
- [shamspias/awesome-dify-agents](https://github.com/shamspias/awesome-dify-agents)
- FlowiseAI agentflowsv2 path extract

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
- [botdirectory.ai](https://botdirectory.ai/) — full `/api/bots.json` (645) + OpenAPI + RSS
- [botmarket.bot](https://botmarket.bot/) — `/v1/agents` (200) + `/v1/skills` (500); offset ignored
- [a2a-registry.org](https://www.a2a-registry.org/) — public /browse agents + agent cards
- [openagentskill.com](https://www.openagentskill.com/) — agent APIs / ranked skill slice
- [skillselion.com](https://skillselion.com/) — `/api/v1/listings` (4k page cap; homepage 403)
- [claude-plugins.dev](https://claude-plugins.dev/) — full search dump (51,845 plugins in jsonl)
- [agentskill.sh](https://agentskill.sh/) — public `/api/skills` slice (count reports 275k)
- [clawhub.ai](https://clawhub.ai/) — OpenAPI + skills/packages API
- [agensi.io](https://www.agensi.io/grok-bot-marketplace) — grok marketplace HTML + skill sitemap URLs
- [claude.com / code.claude.com docs](https://code.claude.com/docs/en/plugins-reference) — official plugin + marketplace docs (HTML/MD)
- [claude.com/plugins](https://claude.com/plugins) — public plugin directory (105 titles from headings)
- [claude.com/product/cowork](https://claude.com/product/cowork) — Cowork product, plugin guide, blog, /plugins directory
- Muse — **no public store**; Meta Muse Spark cookbooks + edheltzel/Muse + third-party listings. See [docs/muse-research.md](docs/muse-research.md)
- [cursor.directory](https://cursor.directory/) — **429** this host
- [marketplace.relevanceai.com](https://marketplace.relevanceai.com/) — sitemap URL list
- [sigrix.io/marketplace/crews](https://sigrix.io/marketplace/crews) — listing HTML
- [marketplace.dify.ai/templates](https://marketplace.dify.ai/templates) — listing HTML
- Coze / Botpress / Voiceflow / Zapier Agents / Gumloop / Pipedream — public listing HTML
- [make.com](https://www.make.com/api/v2/templates/public) — API 401 (login)
- Activepieces `/v1/templates` — HTML app shell, not JSON

Notes and leftovers: [docs/source-candidates.md](docs/source-candidates.md), [docs/source-candidates-batch2.md](docs/source-candidates-batch2.md), [docs/source-candidates-batch3-claude-muse-workflows.md](docs/source-candidates-batch3-claude-muse-workflows.md), [docs/claude-ecosystem-sources.md](docs/claude-ecosystem-sources.md), [docs/muse-research.md](docs/muse-research.md).

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
sources/somi.ai/
sources/grokbot.dev/
sources/grokbothq.xyz/
sources/grokyard.com/
sources/grokindex.dev/
sources/gtemplate.net/
sources/botdirectory.ai/
sources/botmarket.bot/
sources/a2a-registry.org/
sources/openagentskill.com/
sources/skillselion.com/
sources/claude-plugins.dev/
sources/claude.com-docs/
sources/claude.com-cowork/
sources/muse-research/
sources/agentskill.sh/
sources/clawhub.ai/
sources/agensi.io/
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
| somi.ai | 464 |
| grokbot.dev | 789 |
| grokbothq.xyz | 851 |
| grokyard.com | 10 |
| grokindex.dev | 656 |
| gtemplate.net | 16 |
| github/mergisi-awesome-grokbot | 183 |
| github/ZeroPointRepo-GrokBotDev | 918 |
| botdirectory.ai | 646 |
| botmarket.bot | 701 |
| a2a-registry.org | 21 |
| openagentskill.com | 51 |
| skillselion.com | 4001 |
| claude-plugins.dev | 1 (51,845 plugins in jsonl) |
| agentskill.sh | 2001 |
| github/agent-packs-registry | 119 |
| clawhub.ai | 2539 |
| agensi.io | 4001 |
| github/anthropics-claude-plugins-official | 309 |
| github/anthropics-claude-plugins-community | 90 |
| github/anthropics-skills | 117 |
| claude.com-plugins | 106 |
| github/anthropics-knowledge-work-plugins | 1084 |
| github/anthropics-claude-for-legal | 294 |
| github/alexclowe-awesome-claude-cowork-plugins | 409 |
| claude.com-docs | 10 |
| claude.com-cowork | 6 |
| github/hesreallyhim-awesome-claude-code | 18 |
| github/travisvn-awesome-claude-skills | 3 |
| github/ComposioHQ-awesome-claude-skills | 896 |
| github/VoltAgent-awesome-claude-code-subagents | 190 |
| github/ccplugins-awesome-claude-code-plugins | 708 |
| github/anthropics-claude-desktop-buddy | 6 |
| github/abhishekray07-claude-md-templates | 14 |
| github/BehiSecc-awesome-claude-skills | 2 |
| github/anthropics-life-sciences | 72 |
| github/anthropics-commerce-agents | 112 |
| github/wshobson-agents | 1076 |
| github/anthropics-financial-services | 324 |
| github/anthropics-healthcare | 127 |
| github/anthropics-claude-tag-plugins | 82 |
| muse-research | 4 |
| dev.meta.ai-cookbook | 16 |
| github/edheltzel-Muse | 51 |
| muse-thirdparty | 3 |
| github/khendzel-awesome-agent-skills | 3 |
| github/mergisi-awesome-openclaw-agents | 402 |
| github/michielhdoteth-awesome-ai-agent-tools | 133 |
| cursor.directory | 1 (HTTP 429) |
| marketplace.relevanceai.com | 846 |
| sigrix.io | 1 |
| marketplace.dify.ai | 1 |
| github/difyhub-workflows | 28 |
| github/shamspias-awesome-dify-agents | 4 |
| github/FlowiseAI-Flowise-agentflowsv2 | 14 |
| coze.com | 1 |
| botpress.com | 1 |
| voiceflow.com | 1 |
| zapier.com-agents | 1 |
| make.com | 1 |
| gumloop.com | 1 |
| activepieces.com | 1 |
| pipedream.com | 1 |

## Fetch notes

Public fetches use User-Agent `bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)`, polite concurrency, and retries. GitHub packs are `--depth 1` clones with `.git` removed. Refresh: `scripts/fetch_really_bot.py`, `scripts/ingest_additional_sources.py`, `scripts/ingest_xai_marketplace.py`, `scripts/ingest_remaining_sources.py`, `scripts/download_skills_sh.py`, `scripts/ingest_priority_a.py`, `scripts/ingest_priority_b.py`, `scripts/ingest_priority_cd.py`, `scripts/ingest_claude_ecosystem.py`, `scripts/ingest_batch3.py`, `scripts/download_n8n_official.py`.

## Caps / failures

- **skills.sh** — full skill files via the download API (`files/` + hash). The API allows 60 requests/hour; **735** downloaded, **19,252** remaining. Resume via `scripts/download_skills_sh.py`.
- **grokbothq.xyz** — 15 bot slugs ending in `_` have no `.md` variant; HTML saved instead.
- **cursor.com/marketplace** — index HTML plus per-listing metadata; full listing HTML discarded (duplicate ~1.4 MiB Next.js shells).
- **n8nworkflows.xyz** — Cloudflare 403 on retry; 0 workflow JSON files.
- **cursor.directory** — HTTP 429 (including Chrome TLS impersonation).
- **make.com** `/api/v2/templates/public` — 401 not logged in; templates HTML 403.
- **claude-plugins.dev / skillselion / agentskill.sh / clawhub / openagentskill / agensi** — see each ERRORS.md for list-API caps.
- **agentgigs.io** — no unauthenticated job dump.
- **crewform.tech** — no public catalog/API.
- **openjobs.bot** `/api/jobs?status=open` was empty at snapshot; full `/api/jobs` history was saved.

## License / reuse

Content under `sources/` is republished for archival purposes. Copyright and verification remain with the original authors and stewards. Keep source URLs when you quote an item.
