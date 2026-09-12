# Source candidates

Public bot-job or agent-workflow archives mirrored (or considered) in this repo. Each live source has a `sources/<name>/` tree and catalog rows with a `source` field.

Do not invent serials or scrape private data.

## Confirmed (archived)

| Source | Index / entry | Notes |
| --- | --- | --- |
| [really.bot](https://really.bot/) | https://really.bot/runs.json | HTML + JSON + Markdown twins per verified serial. |
| [botteams.io](https://botteams.io/) | `/api/teams`, `/api/bots`, OpenAPI, llms.txt | Paginated bots API merged. |
| [x.ai Grok Bot Marketplace](https://x.ai/bot/marketplace) | sitemap `/bot/marketplace/bots/<slug>` | HTML only; `template` extracted from Next.js RSC. |
| [usegrokbot.com](https://usegrokbot.com/) | llms.txt + homepage | Site briefing. |
| [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot) | GitHub shallow clone | Already present before this pass. |
| [codejunkie99/rosterroom](https://github.com/codejunkie99/rosterroom) | GitHub shallow clone | Already present. |
| [HAEGONG/grok-bot-profiles](https://github.com/HAEGONG/grok-bot-profiles) | GitHub shallow clone | Already present. |
| [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot) | GitHub shallow clone | Catalog + event assets. |
| [bcharleson/grokbot-for-gtm](https://github.com/bcharleson/grokbot-for-gtm) | GitHub shallow clone | GTM playbooks. |
| [kunchenguid/grok-ship](https://github.com/kunchenguid/grok-ship) | GitHub shallow clone | Marked superseded upstream. |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | GitHub shallow clone | README list. |
| [OneRose328/awesome-agentic-workflows](https://github.com/OneRose328/awesome-agentic-workflows) | GitHub shallow clone | Workflow templates. |
| [contentincubator2-ops/open-agent-marketplace](https://github.com/contentincubator2-ops/open-agent-marketplace) | GitHub shallow clone | Agents + schemas. |
| [openjobs.bot](https://openjobs.bot/) | `/api/jobs`, `/api/agents` | Open filter empty at snapshot; full job history saved. |
| [agentgigs.io](https://www.agentgigs.io/) | llms.txt, OpenAPI, `/api/help` | Job browse requires agent API key. |
| [agoraagents.xyz](https://agoraagents.xyz/) | `/v1/jobs/open` | Offset/limit exhausted (15 open jobs). |
| [agenc.ag](https://agenc.ag/) | `/api/tasks` + OpenAPI | Paged until `total`. |
| [a2awire.com](https://a2awire.com/) | `/api/v1/board`, `/api/v1/jobs` | RSS is an HTML shell, not a feed. |
| [skills.sh](https://skills.sh/) | sitemap-skills-1/2 + `/api/download/{owner}/{repo}/{slug}` | Full files when the 60/hour API cap allows; resume-friendly. |
| [teamsmarket.com](https://www.teamsmarket.com/en/teams) | sitemap English `/en/teams/*` | zh-CN duplicates skipped. |
| [cursor.com/marketplace](https://cursor.com/marketplace) | index HTML + listing metadata | Full listing HTML discarded (Next.js shells). |
| [n8nworkflows.xyz](https://n8nworkflows.xyz/) | — | Cloudflare 403; 0 workflow files. |
| [crewform.tech](https://crewform.tech/) | homepage | No public catalog/API. |
| [somi.ai](https://somi.ai/grok-bots) | sitemap `/grok-bots/*` | 462 grok-bot HTML pages. |
| [grokbot.dev](https://grokbot.dev/) | `/api/v1/*.json` + RSS | Full detail JSON for templates/plugins/use-cases/collections/news. |
| [grokbothq.xyz](https://grokbothq.xyz/bots) | `/api/v1/index.json` + `.md` | 850 bots; 15 underscore slugs HTML-only. |
| [grokyard.com](https://grokyard.com/) | `/browse` + `/b/<slug>` | 9 public templates; no sitemap/API. |
| [grokindex.dev](https://grokindex.dev/) | `/api/bots` paged | 655 bots; per-bot HTML skipped (API has descriptions). |
| [gtemplate.net](https://gtemplate.net/) | sitemap | All 21 URLs. |
| [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot) | GitHub shallow clone | `.git` stripped. |
| [ZeroPointRepo/GrokBotDev](https://github.com/ZeroPointRepo/GrokBotDev) | GitHub shallow clone | `.git` stripped. |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | GitHub shallow clone | Official Cowork + Code role plugins. |
| [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) | GitHub shallow clone | Official legal plugins. |
| [alexclowe/awesome-claude-cowork-plugins](https://github.com/alexclowe/awesome-claude-cowork-plugins) | GitHub shallow clone | Profession-specific Cowork plugins. |
| [code.claude.com plugin docs](https://code.claude.com/docs/en/plugins-reference) | HTML + MD snapshots | Official marketplaces listed in plugin-marketplaces.md. |
| [claude.com/product/cowork](https://claude.com/product/cowork) | HTML snapshots | Product, overview, plugins guide, blog, /plugins. |
| Claude Code/Cowork extra packs | GitHub shallow clones | See [claude-ecosystem-sources.md](claude-ecosystem-sources.md): official financial/life-sciences/healthcare/tag/commerce + awesome-claude-* galleries + CLAUDE.md templates. |

## Possible later

| Candidate | Why it might fit | Caveat |
| --- | --- | --- |
| really.bot houses / feed | `/feed.json`, `/house/{handle}.json` | Identity pages, not extra serials. |
| x.ai import URLs (`/bot/<id>`) | `addHref` on marketplace templates | Not extra slugs. |
| skills.sh remaining download API ids | ~19.5k after first burst | API cap 60/hour; re-run `scripts/download_skills_sh.py`. |
| n8nworkflows.xyz definitions | `.well-known/api-catalog`, `/api/download/{id}` | Needs a host that can pass Cloudflare. |
| AgentGigs authenticated jobs | `/api/agent/jobs/available` | Requires `X-API-Key` and matching specializations. |
| Arahi / AI Hive | Mentioned as optional | Skipped; no clean public feed found this pass. |
| crewform.tech catalog | Visual orchestration product | No public listing API. |

See [source-candidates-batch2.md](source-candidates-batch2.md) for Priority A–D of the second ingest.

Add a row under Confirmed when a new `sources/` tree lands.
