# Source candidates — batch 2

Second ingest list. Priority A is archived on `main`. B–D are attempted in follow-up commits. Do not re-fetch trees already under `sources/`.

## Priority A — Grok-specific (archived)

| Source | What was saved | Notes |
| --- | --- | --- |
| [somi.ai/grok-bots](https://somi.ai/grok-bots) | llms.txt, sitemap, 462 `/grok-bots/*` HTML pages | Catalog 464 rows. |
| [grokbot.dev](https://grokbot.dev/) | `/api/v1` lists + 788 detail JSON, RSS, llms, agent page | Catalog 789 rows. |
| [grokbothq.xyz](https://grokbothq.xyz/bots) | `index.json`, 835 bot `.md`, 15 HTML fallbacks | Catalog 851 rows. |
| [grokyard.com](https://grokyard.com/) | homepage, /browse, /about, 9 `/b/*` pages | No public JSON/sitemap. |
| [grokindex.dev](https://grokindex.dev/) | paginated `/api/bots` (655), sitemap, category pages | Per-bot HTML capped. |
| [gtemplate.net](https://gtemplate.net/) | full sitemap HTML (21 URLs, 15 bots) | |
| [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot) | shallow clone, `.git` stripped | 183 catalog rows. |
| [ZeroPointRepo/GrokBotDev](https://github.com/ZeroPointRepo/GrokBotDev) | shallow clone, `.git` stripped | 918 catalog rows. |

## Priority B — APIs / registries (archived)

| Source | What was saved | Notes |
| --- | --- | --- |
| botdirectory.ai | bots.json (645), OpenAPI, RSS, updates | Complete public feed. |
| botmarket.bot | 200 agents, 500 skills | `offset` is ignored by the API. |
| a2a-registry.org | /browse (20 agents) + agent-cards | `POST /a2a/discover` 404. |
| openagentskill.com | ranked skills/packs/tasks/stats | No 30k dump. |
| skillselion.com | 4000 listings (80-page cap) | Homepage/OpenAPI 403. |
| claude-plugins.dev | 51845 plugins in `plugins.jsonl` | One catalog site row. |
| agentskill.sh | 2000 listed skills | Count endpoint 275388. |
| agent-packs/registry | shallow clone | |
| clawhub.ai | 1538 skills + 1000 packages (page caps) | Cursor pagination residual. |
| agensi.io | grok marketplace HTML + 5722 skill URLs | Per-skill HTML not fetched. |

## Priority C — Cursor/Claude/GitHub packs (archived)

| Source | Notes |
| --- | --- |
| cursor.directory | HTTP 429; challenge HTML saved. |
| anthropics/claude-plugins-official | Shallow clone, 309 catalog rows. |
| anthropics/claude-plugins-community | Shallow clone, 90 rows. |
| anthropics/knowledge-work-plugins | Official Cowork + Code role plugins (1084 catalog rows). |
| anthropics/claude-for-legal | Official legal plugins (294 rows). |
| alexclowe/awesome-claude-cowork-plugins | Cowork profession plugins (409 rows). |
| code.claude.com + claude.com/cowork | Official docs/product HTML+MD snapshots. |
| Extra Claude galleries + official kits | See claude-ecosystem-sources.md (ComposioHQ, hesreallyhim, wshobson, financial-services, …). |
| Muse | No gallery; docs/muse-research.md. |
| khendzel/awesome-agent-skills | Shallow clone, 3 rows. |
| mergisi/awesome-openclaw-agents | Shallow clone, 402 rows. |
| michielhdoteth/awesome-ai-agent-tools | Shallow clone, 133 rows. |

## Priority D — workflow platforms (public catalogs only)

| Source | Notes |
| --- | --- |
| marketplace.relevanceai.com | Sitemap 846 URLs (no per-page HTML). |
| sigrix.io/marketplace/crews | Listing HTML. |
| marketplace.dify.ai/templates | Listing HTML. |
| difyhub/workflows + shamspias/awesome-dify-agents | Shallow clones. |
| Coze / Botpress hub / Voiceflow / Zapier Agents / Gumloop / Pipedream | Public HTML only. |
| make.com API | 401 login required. |
| Activepieces /v1/templates | HTML shell. |
| FlowiseAI agentflowsv2 | 13 JSON templates extracted. |
| n8nworkflows.xyz | Still Cloudflare 403. |
