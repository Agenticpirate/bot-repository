# Source candidates — Batch 3 (Claude / Muse / workflows)

Additive ingest on `main`. Skip trees already under `sources/`. Star counts from GitHub at archive time (2026-09-12).

## A — Muse

| Item | Dest | Status |
| --- | --- | --- |
| https://dev.meta.ai/docs/cookbook + Muse Code / agent recipes | `sources/dev.meta.ai-cookbook/` | Archived (HTML + `.md` + llms.txt). **No public Muse store.** |
| edheltzel/Muse | `sources/github/edheltzel-Muse/` | Shallow clone |
| AgentForge + ClaudeMarket Muse listings | `sources/muse-thirdparty/` | AgentForge 200; ClaudeMarket 429 |

See [muse-research.md](muse-research.md).

## B — Claude official / Cowork

| Item | Dest | Status |
| --- | --- | --- |
| https://claude.com/plugins | `sources/claude.com-plugins/` | HTML + 105 titles from headings. `plugins.json` is Webflow, not a catalog. sitemap 404. |
| anthropics/skills | `sources/github/anthropics-skills/` | Official Agent Skills (175k★) |
| anthropics/knowledge-work-plugins | `sources/github/anthropics-knowledge-work-plugins/` | **Already present** |
| anthropics/claude-for-legal | `sources/github/anthropics-claude-for-legal/` | **Already present** |
| claude.com Cowork product + plugin tutorials | `sources/claude.com-cowork/` | **Already present** |
| code.claude.com plugin docs | `sources/claude.com-docs/` | **Already present** |

## C — Claude Code / Cowork community

| Item | Dest | Status |
| --- | --- | --- |
| davila7/claude-code-templates + aitmpl.com | `sources/github/davila7-claude-code-templates/` + `sources/aitmpl.com/` | Clone + sitemap (1877 URLs). SPA APIs are HTML shells. |
| ClaudSkills.com | `sources/claudskills.com/` | llms.txt (~191k skills claimed); no public JSON dump (`/api/skills` 404) |
| skillsboard.sh | `sources/skillsboard.sh/` | llms.txt + sitemap |
| claudemarketplaces.com | `sources/claudemarketplaces.com/` | HTML + sitemap |
| awesome-skills.com | `sources/awesome-skills.com/` | HTML + sitemap |
| claudecowork.im/workflows + /plugins | `sources/claudecowork.im/` | Pages + llms + sitemap (~3922 URLs) |
| madewithclaude.com | `sources/madewithclaude.com/` | Homepage |
| claudebuilds.com | `sources/claudebuilds.com/` | Homepage |
| hesreallyhim / ComposioHQ / travisvn / BehiSecc / VoltAgent / ccplugins / alexclowe awesomes | `sources/github/…` | **Already present** |
| Chat2AnyLLM/awesome-claude-plugins | `sources/github/Chat2AnyLLM-awesome-claude-plugins/` | Clone |
| obra/superpowers | `sources/github/obra-superpowers/` | Clone (285k★) |
| jeremylongshore/claude-code-plugins-plus | `sources/github/jeremylongshore-claude-code-plugins-plus/` | Clone (~279 MiB) |
| daymade/claude-code-skills | `sources/github/daymade-claude-code-skills/` | Clone |
| netresearch/claude-code-marketplace | `sources/github/netresearch-claude-code-marketplace/` | Clone |
| ananddtyagi/cc-marketplace | `sources/github/ananddtyagi-cc-marketplace/` | Clone |
| TheCraigHewitt/cowork-starter-pack | `sources/github/TheCraigHewitt-cowork-starter-pack/` | Clone |
| jitangupta/cowork-boilerplate | `sources/github/jitangupta-cowork-boilerplate/` | Clone |
| helgejo/cowork-template | `sources/github/helgejo-cowork-template/` | Clone |
| machine-costas/claude-projects-templates | `sources/github/machine-costas-claude-projects-templates/` | Clone |

## D — More Grok

| Item | Dest | Status |
| --- | --- | --- |
| xai-org/plugin-marketplace | `sources/github/xai-org-plugin-marketplace/` | Official Grok Build marketplace (distinct from Bot marketplace) |
| botdirectory.ai full API | `sources/botdirectory.ai/` | **Already present** (645 `bots.json` + OpenAPI + RSS) |
| DominikTobureto/awesome-grok-build | `sources/github/DominikTobureto-awesome-grok-build/` | Clone |
| LifeJiggy/Awesome-Grok-Skills | `sources/github/LifeJiggy-Awesome-Grok-Skills/` | Clone |
| GuBeLa/grok-agents-hub | `sources/github/GuBeLa-grok-agents-hub/` | Clone |
| rdmgator12/awesome-grok-bot-plugins | `sources/github/rdmgator12-awesome-grok-bot-plugins/` | Clone |
| mergisi/awesome-grokbot | `sources/github/mergisi-awesome-grokbot/` | **Already present** |

## E — Workflows

| Item | Dest | Status |
| --- | --- | --- |
| Official n8n library `api.n8n.io` | `sources/n8n.io-workflows/` | Search index + per-id workflow JSON; resume via `scripts/download_n8n_official.py` |
| marketplace.crewai.com | `sources/marketplace.crewai.com/` | Listing HTML (sitemap 404) |
| crewAIInc/crewAI-examples | `sources/github/crewAIInc-crewAI-examples/` | Clone |
| crewAIInc/awesome-crewai | `sources/github/crewAIInc-awesome-crewai/` | Clone |
| zapier.com/templates + workflow-gallery | `sources/zapier.com-templates/` | Listing HTML |
| zapier/community-skills | `sources/github/zapier-community-skills/` | Clone |
| make.com/en/templates | `sources/make.com-templates/` | **HTTP 403** (API still 401) |
| workflows.so | `sources/workflows.so/` | Homepage |
| automationflows.io | `sources/automationflows.io/` | Homepage |
| n8ntemplates.me | `sources/n8ntemplates.me/` | Homepage |
| theautomation.directory | `sources/theautomation.directory/` | Homepage (tiny) |
| automationscookbook.com | `sources/automationscookbook.com/` | Homepage |
| Diflowy site | `sources/diflowy.com/` | **NXDOMAIN**; pack cloned |
| green-dalii/diflowy | `sources/github/green-dalii-diflowy/` | Clone |
| arahi.ai/marketplace | `sources/arahi.ai-marketplace/` | Listing HTML |
| beam.ai/agents | `sources/beam.ai-agents/` | Listing HTML |
| svcvit/Awesome-Dify-Workflow | `sources/github/svcvit-Awesome-Dify-Workflow/` | Clone |
| scrapernode/awesome-n8n-templates | `sources/github/scrapernode-awesome-n8n-templates/` | Clone (~311 MiB) |
| zie619/n8n-workflows | `sources/github/zie619-n8n-workflows/` | Clone |
| Empreiteiro/langflow-templates | `sources/github/Empreiteiro-langflow-templates/` | Clone |
| fenggeliaoai/cozeworkflows | `sources/github/fenggeliaoai-cozeworkflows/` | Clone |
| botpress/solutions | `sources/github/botpress-solutions/` | Clone |
