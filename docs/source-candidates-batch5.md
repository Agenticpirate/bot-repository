# Source candidates — Batch 5 (Vellum / Moldable / new galleries)

Additive ingest on `main`. Skip trees already under `sources/`. Scripts: `ingest_depth_galleries.py`, `deepen_new_galleries.py`. Continue `scripts/fill_skills_sh_from_github.py` then `scripts/download_skills_sh.py` for true leftovers.

## Priority 1 — deepen seeded galleries

| Item | Dest | Status |
| --- | --- | --- |
| https://www.vellum.ai/skills | `sources/vellum.ai/` | **Archived**: sitemap **416**, skill/category HTML **88**, **75** skill bodies from `vellum-ai/vellum-assistant/skills` + `catalog.json`, marketplace **43** plugins, docs markdown **310/353**. |
| vellum-ai/vellum-assistant | `sources/github/vellum-ai-vellum-assistant/` | Skills + plugins extract (product `assistant/`/`clients/` trees omitted). |
| https://moldable.sh/bots + sitemap | `sources/moldable.sh/` | **Archived**: **70** sitemap HTML pages, docs.moldable.sh markdown **43/44**. `/api/` and `/download/` disallowed by robots.txt. |
| moldable-ai/apps | `sources/github/moldable-ai-apps/` | Official app templates (2977 files). |
| moldable-ai/skills | `sources/github/moldable-ai-skills/` | Official Moldable skills pack. |

## Priority 2 — new public galleries

| Item | Dest | Status |
| --- | --- | --- |
| officialskills.sh | `sources/officialskills.sh/` | VoltAgent official-vendor skill gallery. Sitemap **741** HTML pages. |
| smithery.ai `GET /skills` | `sources/smithery.ai/` | **420** unique skills (5×100 page cap; API claims 22,603). pageSize>100 → 400. |
| clawskills.sh | `sources/clawskills.sh/` | 7MB homepage; **5167** skill hrefs extracted; first 2000 skill pages + integrations fetched. |
| skillsllm.com | `sources/skillsllm.com/` | Sitemap **5576**; **5033** `/skill/` pages. |
| agentskills.io | `sources/agentskills.io/` | Spec/site HTML + sitemap (9 URLs). |
| hivebook.wiki | `sources/hivebook.wiki/` | Knowledge wiki; sitemap **3968**; first 400 pages. |
| septimlabs.com | `sources/septimlabs.com/` | Mostly localized marketing/blog; sitemap 1693; first 400 pages. |
| BankrBot/openclaw-skills | `sources/github/BankrBot-openclaw-skills/` | OpenClaw/DeFi skill pack (148 SKILL.md). |
| cloudflare/agent-skills-discovery-rfc | `sources/github/cloudflare-agent-skills-discovery-rfc/` | `.well-known/agent-skills` discovery spec. |

## skills.sh leftovers

GitHub Trees/raw retry of remaining slugs filled **0** (folder names no longer match sitemap slugs). After merging concurrent main drips: downloaded_ok **19,001** / 19,998 (**876** true leftovers + **121** permanent 404s). Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`.
