# skills.sh

Public agent-skills registry (Vercel). Full skill file contents via `GET /api/download/{owner}/{repo}/{slug}` (`{files, hash}`), plus GitHub shallow-clone fill for the rest.

- Last updated: 2026-09-13T00:15:08Z
- Skill URLs in sitemap: 19998
- Unique ids: 19998
- Downloaded OK (files/ + hash): 19809
- Filled via GitHub clone: 15032
- Filled via skills.sh API: 4777
- Permanent API 404 + page HTML fallback: 189
- Failed: 0
- Remaining (no files/ yet): 0
- API cap: 60 download requests/hour (live `Retry-After: 60`; client budget 50/hour)
- Concurrency: 1 (keep at 1 while capped)

Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.
Per-skill HTML is saved only for permanent download misses (HTTP 404), not for 429s.
Fast path: `scripts/fill_skills_sh_from_github.py` (shallow clone / Git Trees).
Re-run `scripts/download_skills_sh.py` only for leftovers; already-hashed trees are skipped.

## Sitemap recheck 2026-09-18

- Sitemap skill URLs: **20000** (was 19998).
- New ids vs on-disk trees: **495** (listed in `meta/sitemap-new-ids-2026-09-18.json`).
- Files not downloaded this pass (API 60/hour). Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`

