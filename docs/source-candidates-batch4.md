# Source candidates — Batch 4

Additive ingest on `main` after the 60-day `claude-skills-latest` archive. Skip trees already under `sources/`. Continue `scripts/download_skills_sh.py` (60/hour). First pass archived 2026-09-12 via `scripts/ingest_batch4.py`.

## Priority 1 — Claude skill registries with APIs

| Item | Dest | Notes |
| --- | --- | --- |
| https://skillsmp.com/ `GET /api/v1/skills/search` | `sources/skillsmp.com/` | **Archived**: openapi + llms + popular sitemap 11,213 URLs + capped search |
| https://www.agent37.com/skills + api.agent37.com | `sources/agent37.com/` | Public catalog if any |
| https://agentskills.codes/ | `sources/agentskills.codes/` | Catalog / JSON feeds |
| https://awesomeagentskills.dev/ | `sources/awesomeagentskills.dev/` | |
| https://skillkit.io/ | `sources/skillkit.io/` | |
| https://skillsclaude.org/skills | `sources/skillsclaude.org/` | |
| jeremylongshore/tons-of-skills-marketplace (+ tonsofskills.com) | `sources/github/jeremylongshore-tons-of-skills-marketplace/` | |
| junovale99/claude-skills-directory | `sources/github/junovale99-claude-skills-directory/` | |
| FlorianBruniaux/claude-code-plugins | `sources/github/FlorianBruniaux-claude-code-plugins/` | |
| L3DigitalNet/Claude-Code-Plugins | `sources/github/L3DigitalNet-Claude-Code-Plugins/` | |
| anthropics/claude-plugins-community | `sources/github/anthropics-claude-plugins-community/` | Skip if already present |

## Priority 2 — MCP / skill indexes

| Item | Dest |
| --- | --- |
| dmgrok/agent_skills_directory (CDN JSON) | `sources/github/dmgrok-agent_skills_directory/` |
| wookat/mcp-index `data/index.json` | `sources/github/wookat-mcp-index/` |
| mcp.directory catalog | `sources/mcp.directory/` |
| gengirish/skills-mcp, adarc8/skills-master-mcp, gotalab/skillport, GetSkill-Agent/getskill-mcp | `sources/github/…` |
| team-telnyx/ai `/.well-known/agent-skills/index.json` | `sources/github/team-telnyx-ai/` |
| microsoft/skills, android/skills | `sources/github/microsoft-skills/`, `sources/github/android-skills/` |

## Priority 3 — OpenClaw / SOUL galleries

| Item | Dest |
| --- | --- |
| openclawskills.io/skills | `sources/openclawskills.io/` |
| souls.directory | `sources/souls.directory/` |
| openclawcheatsheet.com/gallery | `sources/openclawcheatsheet.com/` |
| clawsouls/clawsouls, reisierx/famous-souls, tumf/greats-soul-archive | `sources/github/…` |
| VoltAgent/awesome-openclaw-skills | `sources/github/VoltAgent-awesome-openclaw-skills/` |

## Priority 4 — more bots/agents/workflows

botteams.ai, Anil-matcha/awesome-grok-bot, agentmarketplace.ai/browse, nodesphereai, agent.ceo, CrewForm/crewform, docs.crewship.ai, LangSmith Fleet + NirDiamant/awesome-LangGraph, marketinc.io/agents, tgent.com, bolna.ai, agenticskills.io, skillsplayground.com, agentdepot.dev/claude-code, app.kuchhbhi.in/skills.
