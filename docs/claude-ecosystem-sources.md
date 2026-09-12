# Claude Code / Claude Cowork source hunt

Public galleries, official marketplaces, and CLAUDE.md / `.claude/skills` packs surveyed 2026-09-12. Star counts from GitHub at archive time. Do not re-clone trees already under `sources/`.

Official reserved marketplace names (from [plugin-marketplaces.md](https://code.claude.com/docs/en/plugin-marketplaces)): `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `claude-plugins-community`, `claude-community`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `anthropic-agent-skills`, `knowledge-work-plugins`, `life-sciences`, `claude-for-legal`, `claude-for-financial-services`, `financial-services-plugins`, `first-party-plugins`, `claude-tag-plugins`, `healthcare`.

## Already present before this pass

| Repo | Path | Notes |
| --- | --- | --- |
| anthropics/claude-plugins-official | `sources/github/anthropics-claude-plugins-official/` | Official Code marketplace |
| anthropics/claude-plugins-community | `sources/github/anthropics-claude-plugins-community/` | Community marketplace mirror |
| khendzel/awesome-agent-skills | `sources/github/khendzel-awesome-agent-skills/` | |
| VoltAgent/awesome-agent-skills | `sources/github/VoltAgent-awesome-agent-skills/` | Broader than Claude |
| claude-plugins.dev | `sources/claude-plugins.dev/` | 51,845 plugins in jsonl (not exploded) |

## Cloned this pass (high signal)

### Requested

| Repo | ★ | Dest |
| --- | ---: | --- |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | 23988 | `sources/github/anthropics-knowledge-work-plugins/` |
| [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) | 9433 | `sources/github/anthropics-claude-for-legal/` |
| [alexclowe/awesome-claude-cowork-plugins](https://github.com/alexclowe/awesome-claude-cowork-plugins) | 26 | `sources/github/alexclowe-awesome-claude-cowork-plugins/` |

### Official Anthropic marketplaces / kits

| Repo | ★ | Dest | Why |
| --- | ---: | --- | --- |
| [anthropics/financial-services](https://github.com/anthropics/financial-services) | 34800 | `sources/github/anthropics-financial-services/` | Reserved `financial-services-plugins` |
| [anthropics/life-sciences](https://github.com/anthropics/life-sciences) | 595 | `sources/github/anthropics-life-sciences/` | Reserved `life-sciences` marketplace.json |
| [anthropics/healthcare](https://github.com/anthropics/healthcare) | 409 | `sources/github/anthropics-healthcare/` | Reserved `healthcare` |
| [anthropics/claude-tag-plugins](https://github.com/anthropics/claude-tag-plugins) | 48 | `sources/github/anthropics-claude-tag-plugins/` | Reserved name |
| [anthropics/commerce-agents](https://github.com/anthropics/commerce-agents) | 2761 | `sources/github/anthropics-commerce-agents/` | Official shopping/merchant agent blueprint |
| [anthropics/claude-desktop-buddy](https://github.com/anthropics/claude-desktop-buddy) | 2590 | `sources/github/anthropics-claude-desktop-buddy/` | Cowork + Code Desktop Bluetooth reference |

`anthropics/claude-for-financial-services` and `anthropics/first-party-plugins` / `anthropics/agent-skills` returned 404 (names reserved; content lives in `financial-services` or unpublished).

### Awesome lists / galleries / template packs

| Repo | ★ | Dest | Why |
| --- | ---: | --- | --- |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 74905 | `sources/github/ComposioHQ-awesome-claude-skills/` | Largest public skills awesome |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 53920 | `sources/github/hesreallyhim-awesome-claude-code/` | Canonical awesome-claude-code |
| [wshobson/agents](https://github.com/wshobson/agents) | 39584 | `sources/github/wshobson-agents/` | Multi-harness plugin marketplace |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 25023 | `sources/github/VoltAgent-awesome-claude-code-subagents/` | 100+ subagents |
| [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 15039 | `sources/github/travisvn-awesome-claude-skills/` | Skills awesome |
| [BehiSecc/awesome-claude-skills](https://github.com/BehiSecc/awesome-claude-skills) | 10121 | `sources/github/BehiSecc-awesome-claude-skills/` | Skills awesome |
| [ccplugins/awesome-claude-code-plugins](https://github.com/ccplugins/awesome-claude-code-plugins) | 935 | `sources/github/ccplugins-awesome-claude-code-plugins/` | Plugin gallery |
| [abhishekray07/claude-md-templates](https://github.com/abhishekray07/claude-md-templates) | 328 | `sources/github/abhishekray07-claude-md-templates/` | CLAUDE.md template pack |

## Official docs / product pages (HTML + MD snapshots)

| URL | Dest |
| --- | --- |
| https://code.claude.com/docs/en/plugins-reference (+ `.md`) | `sources/claude.com-docs/` |
| https://code.claude.com/docs/en/plugins | same |
| https://code.claude.com/docs/en/discover-plugins | same |
| https://code.claude.com/docs/en/plugin-marketplaces | same |
| https://code.claude.com/docs/llms.txt | same |
| https://claude.com/product/cowork | `sources/claude.com-cowork/` |
| https://claude.com/docs/cowork/overview | same |
| https://claude.com/docs/cowork/guide/plugins | same |
| https://claude.com/blog/cowork-plugins | same |
| https://claude.com/plugins/ | same |

404 this pass: `code.claude.com/docs/en/discover-and-install-remote-plugins`, `anthropic.com/news/cowork`.

## Found, not cloned (skip reasons)

Huge product apps / Cowork alternatives (not galleries):

| Repo | ★ | Why skipped |
| --- | ---: | --- |
| nexu-io/open-design | 95709 | Design desktop app, not a plugin gallery |
| different-ai/openwork | 23490 | Open-source Cowork alternative |
| iOfficeAI/AionUi | 32772 | Desktop UI, not a catalog |
| eigent-ai/eigent | 15254 | Cowork desktop alternative |
| rowboatlabs/rowboat | 17532 | Coworker product |
| composio-community/open-claude-cowork | 4353 | Cowork alternative |
| DevAgentForge/Open-Claude-Cowork | 3397 | Cowork alternative |
| kuse-ai/kuse_cowork | 757 | Cowork alternative |
| TesslateAI/OpenSail | 643 | Desktop alternative |

Guides / smaller awesomes (documented, not cloned this pass):

| Repo | ★ | Notes |
| --- | ---: | --- |
| wesammustafa/Claude-Code-Everything-You-Need-To-Know | 3000 | Guide, not a gallery |
| rohitg00/awesome-claude-code-toolkit | 2608 | Toolkit; overlap with cloned awesomes |
| Prat011/awesome-llm-skills | 1736 | Multi-harness skills list |
| composio-community/awesome-claude-plugins | 1956 | Plugin awesome; overlap |
| jqueryscript/awesome-claude-code | 513 | Smaller awesome |
| karanb192/awesome-claude-skills | 510 | Smaller awesome |
| helloianneo/awesome-claude-code-skills | 465 | CN/EN skills list |
| rahulvrane/awesome-claude-agents | 362 | Subagent list |
| nuwa-skills/awesome-nuwa | 362 | Persona skills |
| athola/claude-night-market | 337 | Plugin pack |
| LangGPT/awesome-claude-code | 267 | CN resources |
| fleurytian/awesome-claude-skills | 316 | Role skills |
| w95/awesome-claude-corporate-skills | 198 | Corporate skills |
| GetBindu/awesome-claude-code-and-skills | 189 | Combined list |
| deanpeters/Product-Manager-Skills | 6928 | PM skills (single product) |
| mhattingpete/claude-skills-marketplace | 671 | Engineering marketplace |
| oliwoodman/claude-md-templates | 45 | Smaller CLAUDE.md pack |
| Workflowsio/company-os-starter-kit | 84 | Company OS starter |
| anthropics/oncall-kit | 150 | On-call kit, not a marketplace |
| anthropics/code-migration-kit-with-claude-code | 333 | Migration kit |

`.claude/skills` marketplaces with few stars (mhattingpete excepted) were left as candidates.

## Web / product notes

- Claude Code docs live on `code.claude.com/docs/en/*` (Mintlify). Marketplace how-to is `/plugin-marketplaces`; discovery is `/discover-plugins`.
- Cowork product + plugin tutorial pages live on `claude.com/product/cowork`, `claude.com/docs/cowork/*`, `claude.com/blog/cowork-plugins`, and the public plugin directory `claude.com/plugins/`.
- `claude-plugins.dev` was already archived as a full search dump.
- Muse hunt is separate: [muse-research.md](muse-research.md).
