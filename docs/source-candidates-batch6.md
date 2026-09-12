# Source candidates — Batch 6 (OpenClaw / SOUL galleries)

Additive ingest on `main`. Skip trees already under `sources/`. Script: `scripts/ingest_openclaw_souls.py`. Continue `scripts/fill_skills_sh_from_github.py` then `scripts/download_skills_sh.py` for skills.sh leftovers.

## Already under `sources/` (not re-cloned)

| Item | Dest | Notes |
| --- | --- | --- |
| clawhub.ai | `sources/clawhub.ai/` | **Deepened** this pass: resume `/api/v1/skills` cursor + SKILL.md file API. clawhub.com is the same app (homepage snapshot only). |
| VoltAgent/awesome-openclaw-skills | `sources/github/VoltAgent-awesome-openclaw-skills/` | 5300+ link index (points at clawskills.sh). Already cloned. |
| mergisi/awesome-openclaw-agents | `sources/github/mergisi-awesome-openclaw-agents/` | 205 SOUL.md templates + agents.json. Already cloned. |
| souls.directory | `sources/souls.directory/` | Public `GET /api/souls/{handle}/{slug}.md`. Leftover API pass this batch. |
| clawskills.sh | `sources/clawskills.sh/` | 5167 skill hrefs; remaining HTML pages fetched this batch. |

## New / first-time archives

| Item | Dest | Status |
| --- | --- | --- |
| openclaw.com.au/skills | `sources/openclaw.com.au/` | Docs/guide sitemap (no per-skill JSON; `/api/skills` 404). |
| agent.soulid.io | `sources/agent.soulid.io/` | Homepage agent hrefs + HTML. No public JSON API. |
| cerealskill/openclaw-agents | `sources/github/cerealskill-openclaw-agents/` | SOUL.md + IDENTITY.md agent bundles. |
| thedaviddias/souls-directory | `sources/github/thedaviddias-souls-directory/` | Site source for souls.directory (not a SOUL dump). |
| raulvidis/openclaw-multi-agent-kit | `sources/github/raulvidis-openclaw-multi-agent-kit/` | SOUL/IDENTITY/skill templates. |
| Humain-Cloud/HumAIn-Uno | `sources/github/Humain-Cloud-HumAIn-Uno/` | Product + TypeScript seed-agents (no SKILL/SOUL.md dump). |
| kriptoburak/open-agent-marketplace | `sources/kriptoburak-open-agent-marketplace/` | GitHub **404**. Related pack already at `github/contentincubator2-ops-open-agent-marketplace`. |

## Misses / aliases

- **clawhub.com** — same HTML app as clawhub.ai; not a second catalog.
- **kriptoburak/open-agent-marketplace** — user/repo not public.
- **HumAIn-Uno** — 800+ agents are TypeScript seeds, not a public JSON/SOUL dump.

## skills.sh leftovers

GitHub Trees/raw leftover retry still expected to fill **0** when folder names no longer match sitemap slugs. True remaining after 19,002 downloads: **875** + **121** permanent 404s. Resume API drip: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`.
