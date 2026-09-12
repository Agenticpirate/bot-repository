# Source candidates — Batch 4

Additive ingest on `main`. Skip trees already under `sources/`. Continue `scripts/download_skills_sh.py` (60/hour). Scripts: `ingest_batch4.py`, `deepen_batch4.py`.

## Priority 1 — Claude skill registries with APIs

| Item | Dest | Status |
| --- | --- | --- |
| skillsmp.com `GET /api/v1/skills/search` | `sources/skillsmp.com/` | **Archived**: openapi + llms + popular sitemap **11,213** + **2,002** search uniques + **1,978** GitHub raw SKILL.md. Search API has no file dump; anonymous 50/day. |
| agent37.com/skills + api.agent37.com | `sources/agent37.com/` | Pages + sitemap. `/v1/skills` and `/v1/catalog` **401** (API key). |
| agentskills.codes | `sources/agentskills.codes/` | **`GET /api/v1/skills` full catalog: 11,518**. Sitemap + llms.txt. No per-skill content API. |
| awesomeagentskills.dev | `sources/awesomeagentskills.dev/` | Homepage HTML only (no sitemap/API). |
| skillkit.io | `sources/skillkit.io/` | **403** Cloudflare/HTML challenge. |
| skillsclaude.org/skills | `sources/skillsclaude.org/` | Next.js HTML; no public JSON/sitemap. |
| jeremylongshore/tons-of-skills-marketplace + tonsofskills.com | `sources/github/jeremylongshore-tons-of-skills-marketplace/` + `sources/tonsofskills.com/` | Clone + site HTML |
| junovale99 / FlorianBruniaux / L3DigitalNet | `sources/github/…` | Cloned |
| anthropics/claude-plugins-community | `sources/github/anthropics-claude-plugins-community/` | Already present |

## Priority 2 — MCP / skill indexes

| Item | Dest | Status |
| --- | --- | --- |
| dmgrok/agent_skills_directory | `sources/github/dmgrok-agent_skills_directory/` | Clone + **1,257** catalog.json skills |
| wookat/mcp-index | `sources/github/wookat-mcp-index/` | `data/index.json` **4,209** MCP items |
| mcp.directory | `sources/mcp.directory/` | llms.txt + sitemap (catalog first 4,000 URLs) |
| gengirish / adarc8 / gotalab / GetSkill-Agent MCP repos | `sources/github/…` | Cloned |
| team-telnyx/ai + well-known | `sources/github/team-telnyx-ai/` + `sources/telnyx.com-agent-skills/` | Repo clone + **247** discovery skills, **241** `.md` |
| microsoft/skills, android/skills | `sources/github/microsoft-skills/`, `android-skills/` | Cloned (199 / 25 SKILL.md catalog rows) |

## Priority 3 — OpenClaw / SOUL

| Item | Dest | Status |
| --- | --- | --- |
| openclawskills.io/skills | `sources/openclawskills.io/` | Page + sitemap (8 URLs) |
| souls.directory | `sources/souls.directory/` | llms.txt + large sitemap (catalog first 4,000) |
| openclawcheatsheet.com/gallery | `sources/openclawcheatsheet.com/` | Gallery + sitemap **357** URLs |
| clawsouls / famous-souls / greats-soul-archive | `sources/github/…` | Cloned |
| VoltAgent/awesome-openclaw-skills | `sources/github/VoltAgent-awesome-openclaw-skills/` | Cloned |

## Priority 4 — more bots/agents/workflows

| Item | Dest | Status |
| --- | --- | --- |
| botteams.ai | `sources/botteams.ai/` | Homepage (API/llms later NXDOMAIN from this host) |
| Anil-matcha/awesome-grok-bot | `sources/github/Anil-matcha-awesome-grok-bot/` | Cloned |
| agentmarketplace.ai/browse | `sources/agentmarketplace.ai/` | Browse HTML + sitemap 180 URLs |
| nodesphereai | `sources/nodesphereai/` | **NXDOMAIN** |
| agent.ceo | `sources/agent.ceo/` | Home + registry + docs + llms.txt |
| CrewForm/crewform + docs.crewship.ai | `sources/github/CrewForm-crewform/` + `sources/docs.crewship.ai/` | Clone + docs HTML; no public templates API |
| LangSmith Fleet + NirDiamant/awesome-LangGraph | `sources/github/NirDiamant-awesome-LangGraph/` | Awesome cloned; Fleet is docs-only |
| marketinc.io/agents, tgent.com, bolna.ai | `sources/marketinc.io/`, `tgent.com/`, `bolna.ai/` | Public HTML |
| agenticskills.io, skillsplayground.com, agentdepot.dev, app.kuchhbhi.in/skills | matching `sources/` | HTML snapshots |
