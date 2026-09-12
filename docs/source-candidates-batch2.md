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

## Priority B — APIs / registries

| Source | Planned entry | Status |
| --- | --- | --- |
| botdirectory.ai | `/api/bots.json`, OpenAPI, llms.txt, RSS | To archive |
| botmarket.bot | `/v1/agents`, `/v1/skills` | To archive |
| a2a-registry.org | discover / agent cards / public stats | To archive |
| openagentskill.com | agent-skills-directory + `/api/agent/*` | To archive |
| skillselion.com | OpenAPI/MCP/.well-known (homepage 403) | To archive |
| claude-plugins.dev | `api.claude-plugins.dev/api/search` | To archive |
| agentskill.sh | `/api/skills` + listings | To archive |
| github.com/agent-packs/registry | shallow clone | To archive |
| clawhub.ai | llms + public catalog | To archive |
| agensi.io/grok-bot-marketplace | public pages | To archive |

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
