# Source audit — 2026-09-18

Live probe of public bot / skill / Grok Bot galleries. Goal: make [Agenticpirate/bot-repository](https://github.com/Agenticpirate/bot-repository) the go-to attribution archive (this repo + Compound explorer in [PR #3](https://github.com/Agenticpirate/bot-repository/pull/3)).

- Probed at: **2026-09-18T18:11:24Z**
- Probe URLs: **101** → live **89**, dead **11**, blocked **1**
- Raw JSON: [`meta/source-audit-2026-09-18.json`](meta/source-audit-2026-09-18.json)
- User-Agent: `bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)`
- Confidence is from this host’s HTTP response + content-type / JSON shape. SPA shells that return 200 without a dump are marked live but “HTML only”.

No invented listings. Canonical pages stay on the source sites.

## Status legend

| Status | Meaning |
| --- | --- |
| **Already archived** | `sources/<path>/` exists; refresh if the live count moved |
| **New / refresh needed** | Live public dump or listing not yet (or not freshly) archived |
| **Blocked** | Cloudflare / login / 429 from this host |
| **Dead** | NXDOMAIN, HTTP 404, or connect failure |

## Counts (this pass)

| Bucket | n |
| --- | ---: |
| Official Grok surfaces probed | 16 |
| Third-party Grok galleries probed | 28 |
| Skills / agents / MCP / workflow probed | 40 |
| GitHub existence checks | 9 |
| **New Grok galleries to archive this pass** | **5** (grokbot-templates.com, grokbottemplates.dev, grokmarket.io, grokbottemplates.app, cobusgreyling catalog) |
| **Refresh-needed (count moved or stale snapshot)** | official marketplace 71→72; really.bot 1214→1224; agent-hunt 58→64; grokbot.dev templates 739 |
| **Blocked** | n8nworkflows.xyz (Cloudflare 403) |
| **Dead / 404** | x.ai `/bot/marketplace/plugins`; grok.com `/marketplace/plugins`; grokyard sitemap; skillhub.dev; mcpmarket.com/skills; guessed `awesome-grokbot-templates` GitHub paths |

---

## Official Grok

| Candidate | Status | Confidence | Public API / JSON / sitemap | Notes |
| --- | --- | --- | --- | --- |
| [x.ai/bot/marketplace](https://x.ai/bot/marketplace) | Already archived → **refresh** | high | [sitemap.xml](https://x.ai/sitemap.xml): **251** locs, **72** `/bot/marketplace/bots/*`, **9** category pages | Was 71 (2026-09-12). **+1 new slug `stalk-bot`** (Stalk Bot / Shub Gaur). All 72 pages yielded `template.json`. |
| Category pages (product / engineering / operations / personal / sales / marketing / design / recruiting-people / from-grok-bot-team) | Already archived → refresh | high | HTML listings; bot hrefs 2–47 per page | All nine **200**. Index after categories still 72 unique slugs (no extras hiding only on category pages). |
| [grok.com/bot/marketplace](https://grok.com/bot/marketplace) | Already archived (shell) | high | HTML/JS app; no public JSON twin | Same marketplace, in-app host. |
| [grok.com/bot/marketplace/plugins](https://grok.com/bot/marketplace/plugins) | Already archived (shell) | high | HTML/JS **200** | **Current Plugins tab.** Old `/marketplace/plugins` 404s. |
| [x.ai/bot/marketplace/plugins](https://x.ai/bot/marketplace/plugins) | Dead | high | HTTP **404** | Confirmed gone. Do not treat as a listing URL. |
| [grok.com/marketplace/plugins](https://grok.com/marketplace/plugins) | Dead | high | HTTP **404** | Legacy path. |
| [x.ai/bot/marketplace/bots](https://x.ai/bot/marketplace/bots) (no slug) | Dead | high | HTTP **404** | Collection is `/bots/<slug>` only. |
| [x.ai/news/grok-plugin-marketplace](https://x.ai/news/grok-plugin-marketplace) | Already archived | high | HTML | Grok **Build** plugin marketplace announcement. |
| [xai-org/plugin-marketplace](https://github.com/xai-org/plugin-marketplace) | Already archived → refresh | high | `.grok-plugin/marketplace.json` + generated `plugin-index.json` | **Source of truth for plugins** (27 at last archive). In-app `/plugin` / `/marketplace`. |

---

## Third-party Grok

| Candidate | Status | Confidence | Public API / JSON / sitemap | Notes |
| --- | --- | --- | --- | --- |
| [really.bot/runs.json](https://really.bot/runs.json) | Already archived → **refresh** | high | `runs.json` **LIVE**, **1224** runs (was 1214) | +10 serials since 2026-09-12. llms.txt live. |
| [botteams.io](https://botteams.io/) | Already archived → refresh | high | `/api/bots`, `/api/teams`, OpenAPI, llms.txt | First `/api/bots` page 25; paginate for full set (was 60 bots / 15 teams). Not affiliated with xAI. |
| [grokyard.com/browse](https://grokyard.com/browse) | Already archived → refresh | high | **No sitemap** (404). No JSON API. HTML `/b/<slug>` | www + apex both 200. Last archive: 9 public templates. |
| [grokindex.dev](https://grokindex.dev/) | Already archived | high | `GET /api/bots?page=` **LIVE**, `total=655`; sitemap 688 | Same count as 2026-09-12. Refresh index JSON. |
| [grokbothq.xyz](https://grokbothq.xyz/bots) | Already archived | high | `/api/v1/index.json` **LIVE**, **850** bots | Same count. Per-bot `.md` twins. |
| [grokbot.dev](https://grokbot.dev/) | Already archived → refresh | high | `/api/v1/templates.json` **739** (was part of 788 details) | Full list APIs + detail JSON. |
| [gtemplate.net](https://gtemplate.net/) | Already archived | high | sitemap **21** locs | Unchanged. |
| [usegrokbot.com](https://usegrokbot.com/) | Already archived → refresh | high | [llms.txt](https://usegrokbot.com/llms.txt) **LIVE** (71 lines) | Briefing + homepage, not a serial dump. |
| [somi.ai/grok-bots](https://somi.ai/grok-bots) | Already archived → refresh | high | sitemap **3069** locs (was 462 grok-bot pages) | Sitemap grew a lot; re-filter `/grok-bots/*` and fetch new slugs only. |
| [teamsmarket.com](https://www.teamsmarket.com/en/teams) | Already archived | medium | sitemap **874** | English team pages. |
| **[grokbot-templates.com](https://grokbot-templates.com/)** | **New** | high | `/api/templates?page=` **1404** items (48/page); sitemap **1588** (1405 templates + 160 use-cases + 9 teams); llms.txt 191 lines | Claims ~1142; live API total **1404**. About page cites GitHub `awesome-grokbot-templates` — guessed owner paths **404**. Share URLs are `x.ai/bot/<id>`. |
| **[grokbottemplates.dev](https://www.grokbottemplates.dev/templates)** | **New** | high | `/api/templates` **484**; sitemap 508 | Deduped public listings + `shareUrl` / `sourceUrl`. |
| **[grokmarket.io](https://grokmarket.io/)** | **New** | high | `/api/templates` **580** (single page); sitemap 601; llms.txt | Third-party directory. `templateUrl` = x.ai share. |
| **[grokbottemplates.app](https://grokbottemplates.app/find/)** | **New** | medium | HTML tool-picker; sitemap/llms to confirm | Another public-share catalog. |
| **[cobusgreyling/grok-bot-templates](https://github.com/cobusgreyling/grok-bot-templates)** | **New** | high | Pages API: `/catalog.json`, `/api/v1/status.json`, `/api/v1/teams.json`, llms.txt | 49 templates / 10 teams / 47 skills (upstream README). Installer-first PROFILE.md pack. |
| [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot) | Already archived | high | GitHub | Mentions grokory, groktemplate.vercel.app, grok-bot-template-market, 0xNyk/awesome-grok-bot as further indexes — verify next pass. |
| [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot), [ZeroPointRepo/GrokBotDev](https://github.com/ZeroPointRepo/GrokBotDev), [Anil-matcha/awesome-grok-bot](https://github.com/Anil-matcha/awesome-grok-bot) | Already archived | high | GitHub | Live. |

---

## Skills / agents / MCP / workflows

| Candidate | Status | Confidence | Public API / JSON / sitemap | Notes |
| --- | --- | --- | --- | --- |
| [skills.sh](https://skills.sh/) | Already archived → **sitemap recheck** | high | sitemap index 4 children; `sitemap-skills-1.xml` **10 000** locs | Last complete archive: **19 998** ids, **19 809** hashed files, **189** permanent 404s. Download API still **60/hour**. Diff sitemap vs `sources/skills.sh/skills/` for new ids only. |
| [clawhub.ai](https://clawhub.ai/) | Already archived | high | `/api/v1/skills` cursor API; llms.txt | Last dump **43 969** slugs / **43 968** SKILL.md. UI on [hub.openclaw.ai](https://hub.openclaw.ai/) now claims **52.7k tools** — cursor still live; **do not** add more per-skill `catalog.json` rows (GitHub 100 MB cap). Full lists stay in `sources/clawhub.ai/meta/`. |
| [hub.openclaw.ai](https://hub.openclaw.ai/) | Already archived (alias) | high | Same `/api/v1/skills` + llms.txt as clawhub.ai | Snapshot homepage only. Not a second catalog. |
| [souls.directory](https://souls.directory/) | Already archived | high | llms.txt **4703** lines; `GET /api/souls/{handle}/{slug}.md` | Last pass: **4654** SOUL.md; 2 leftover URLs are docs placeholders. Leftovers **done**. Re-check llms for any new souls. |
| [agent-hunt.netlify.app/agents.json](https://agent-hunt.netlify.app/agents.json) | Already archived → **refresh** | high | `agents.json` **LIVE**, **64** (was 58) | Updates twice daily. |
| [vellum.ai/skills](https://www.vellum.ai/skills) | Already archived | high | sitemap + GitHub bodies | 75 skills. |
| [moldable.sh/bots](https://moldable.sh/bots) | Already archived | high | sitemap + GitHub packs | 70 site URLs. |
| [officialskills.sh](https://officialskills.sh/) | Already archived | high | sitemap 741 | VoltAgent official-vendor gallery. |
| [smithery.ai](https://smithery.ai/skills) | Already archived | medium | `GET /skills` 5×100 cap | Claims 22 603; we have 420 uniques. |
| [clawskills.sh](https://clawskills.sh/) | Already archived | high | homepage hrefs | 5 167 skill HTML pages. |
| [skillsllm.com](https://skillsllm.com/) | Already archived | high | sitemap `/skill/` | 5 576 sitemap / 5 033 HTML. |
| [mcp.directory/skills](https://www.mcp.directory/skills) | Already archived | medium | HTML + prior 4001 catalog rows | Claims 4 400+ skills. |
| [agentskills.codes](https://agentskills.codes/) | Already archived | high | `/api/v1/skills` | 11 518. |
| [skillsmp.com](https://www.skillsmp.com/) | Already archived | medium | search API + popular sitemap | 11 213 sitemap URLs. |
| [claude-plugins.dev](https://claude-plugins.dev/) | Already archived | high | search dump jsonl | 51 845 plugins in jsonl (not catalog.json). |
| [claude.com/plugins](https://claude.com/plugins) | Already archived | high | HTML headings | 105 titles. |
| [cursor.com/marketplace](https://cursor.com/marketplace) | Already archived | high | index HTML + listing metadata | |
| [n8n.io/workflows](https://n8n.io/workflows) | Already archived | high | `api.n8n.io` search + per-id JSON | 12 268 workflow files. |
| [n8nworkflows.xyz](https://n8nworkflows.xyz/) | **Blocked** | high | Cloudflare **403** | Still 0 workflow JSON from this host. |
| [claudeskills.info](https://claudeskills.info/) | **New** | medium | sitemap index (9 child sitemaps); llms.txt 52 lines | Mid-size Claude SKILL.md hub. Archive sitemap + llms this pass if size-safe. |
| [findskills.org](https://findskills.org/) | **New** | medium | sitemap **106** | Search/install surface. |
| [mastering-claude.com/skills](https://mastering-claude.com/skills/) | **New** | medium | HTML curated list (~297) | Editorial, not a dump. |
| [lobehub.com/skills](https://www.lobehub.com/skills) | **New** | medium | HTML | Skills bolted onto LobeHub. |
| [agenticskills.io](https://agenticskills.io/ai-skills-directories) | Already archived | high | comparison page | Useful outbound index (skills.sh, SkillsMP, Skills Directory). |
| [skillhub.dev](https://skillhub.dev/) | **Dead** | high | connect fail | |
| [mcpmarket.com/skills](https://mcpmarket.com/skills) | **Dead** | high | HTTP 404 | |

---

## Expanded beyond the seed list (this audit)

Found via web search + outbound links, not in the original seed:

| URL | Why it matters | Action |
| --- | --- | --- |
| https://grokbot-templates.com/ | Largest third-party Grok directory (1404 API / 1588 sitemap) | Archive |
| https://www.grokbottemplates.dev/templates | 484-template JSON API | Archive |
| https://grokmarket.io/ | 580-template JSON API | Archive |
| https://grokbottemplates.app/find/ | Tool-filtered public shares | Archive listing |
| https://github.com/cobusgreyling/grok-bot-templates + Pages catalog.json | Installer-first PROFILE.md kit | Clone + API |
| https://x.ai/bot/guides/templates-for-grok-bot | Official template semantics | Snapshot with marketplace refresh |
| https://claudeskills.info/ | Claude SKILL.md hub | Light archive |
| https://findskills.org/ | 106-URL sitemap | Light archive |
| https://www.lobehub.com/skills | Skills gallery | Light / note |
| https://mastering-claude.com/skills/ | Curated 297 | Light / note |
| grokory, groktemplate.vercel.app, grok-bot-template-market, 0xNyk/awesome-grok-bot | Named in majiayu000 index | Verify next pass (no stable public dump confirmed this hour) |

---

## Catalog.json cap

`catalog.json` is **~95.1 MiB** (GitHub hard limit **100 MiB**). Rules for this refresh:

- Official x.ai marketplace: keep **all** bot rows (~72).
- Existing mid-size Grok sources (grokbothq, grokindex, grokbot.dev, somi): upsert in place.
- New galleries ≥400 items: **site-row counter + first 400 catalog rows**; full lists in `sources/<host>/meta/`.
- clawhub.ai: **no new per-skill catalog rows**. `meta/skills.json` remains the full list.
- skills.sh: add only **new** sitemap ids, not a second 20k dump.

---

## Explorer / hub

[PR #3](https://github.com/Agenticpirate/bot-repository/pull/3) (`cursor/explorer-search-app-881b`) is still **open**. `apps/explorer` is **not on main**. After this scrape lands, the explorer seed index (`scripts/build-explorer-index.py` + `apps/explorer/public/index/`) needs a rebuild so `/explore` shows `stalk-bot` and the new Grok galleries. Do not silently rebase that PR onto this scrape; it is a separate app branch.

---

## After-refresh (same day)

| Source | Before | After | Folder |
| --- | ---: | ---: | --- |
| x.ai marketplace bots | 71 | **72** (+`stalk-bot`) | `sources/x.ai-bot-marketplace/` |
| x.ai plugins | 27 | **28** @ `1581c908` | `sources/x.ai-bot-marketplace-plugins/` |
| really.bot | 1214 | **1224** (+10) | `sources/really.bot/` |
| botteams.io | 15 teams / 60 bots | same | `sources/botteams.io/` |
| grokbothq.xyz | 850 | 850 (15 underscore `.md` still HTML-only) | `sources/grokbothq.xyz/` |
| grokindex.dev | 655 | 655 | `sources/grokindex.dev/` |
| grokyard.com | 9 | 9 | `sources/grokyard.com/` |
| gtemplate.net | 15 bots | 15 | `sources/gtemplate.net/` |
| grokbot.dev | 789 rows | **943** | `sources/grokbot.dev/` |
| somi.ai grok-bots | 462 | 462 (site sitemap 3069 is whole somi.ai) | `sources/somi.ai/` |
| agent-hunt | 58 | **64** | `sources/agent-hunt.netlify.app/` |
| skills.sh sitemap | 19998 | **20000** (**+495** new ids, files pending) | `sources/skills.sh/meta/` |
| souls.directory | 4654 / 4656 | **4654 / 4656** (leftovers still the 2 docs placeholders) | `sources/souls.directory/` |
| clawhub.ai | 43969 slugs | homepage + sample only (no catalog growth) | `sources/clawhub.ai/` |
| grokbot-templates.com | — | **1404** templates (402 catalog rows) | `sources/grokbot-templates.com/` **NEW** |
| grokbottemplates.dev | — | **484** (402 catalog rows) | `sources/grokbottemplates.dev/` **NEW** |
| grokmarket.io | — | **580** (402 catalog rows) | `sources/grokmarket.io/` **NEW** |
| grokbottemplates.app | — | site row (no item API) | `sources/grokbottemplates.app/` **NEW** |
| cobusgreyling catalog | — | **49** + GitHub pack (473 files) | `sources/cobusgreyling.github.io-grok-bot-templates/` **NEW** |
| claudeskills.info | — | sitemap 73,792; 200 sample pages | `sources/claudeskills.info/` **NEW** |
| findskills.org | — | 106 sitemap pages | `sources/findskills.org/` **NEW** |
| catalog.json | 262,192 | **263,623** (100,079,609 bytes) | still under 100 MiB |

## Probe method

```
python3 scripts/audit_probe_2026_09_18.py
```

Refresh (force-refetch indexes, download only missing bodies):

```
python3 scripts/refresh_2026_09_18.py
python3 scripts/ingest_xai_marketplace.py   # official bots
python3 scripts/archive_xai_marketplace_plugins.py
```
