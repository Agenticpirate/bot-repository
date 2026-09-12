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

## Priority C — Cursor/Claude/GitHub packs

| Source | Planned entry |
| --- | --- |
| cursor.directory | public listings |
| anthropics/claude-plugins-official | shallow clone |
| anthropics/claude-plugins-community | shallow clone |
| khendzel/awesome-agent-skills | shallow clone |
| mergisi/awesome-openclaw-agents | shallow clone |
| michielhdoteth/awesome-ai-agent-tools | shallow clone |

## Priority D — workflow / agent template platforms

Public catalogs only. Retry n8nworkflows.xyz if Cloudflare allows.

Relevance AI, Sigrix, Dify (+ GitHub packs), Coze, Botpress, Voiceflow, Zapier Agents, Make.com `/api/v2/templates/public`, Gumloop, Activepieces `/v1/templates`, Pipedream, FlowiseAI agentflowsv2 path extract.
