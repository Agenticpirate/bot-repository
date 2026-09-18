# skills.sh

Public agent-skills registry (Vercel). Full skill file contents via `GET /api/download/{owner}/{repo}/{slug}` (`{files, hash}`), plus GitHub shallow-clone fill for the rest.

- Last updated: 2026-09-18T18:30:59Z
- Skill URLs in sitemap: 20000
- Unique ids: 20000
- Downloaded OK (files/ + hash): 20304
- Filled via GitHub clone: 15526
- Filled via skills.sh API: 4778
- Permanent API 404 + page HTML fallback: 189
- Failed: 0
- Remaining (no files/ yet): 0
- API cap: 60 download requests/hour (live `Retry-After: 60`; client budget 50/hour)
- Concurrency: 1 (keep at 1 while capped)

Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.
Per-skill HTML is saved only for permanent download misses (HTTP 404), not for 429s.
Fast path: `scripts/fill_skills_sh_from_github.py` (shallow clone / Git Trees).
Re-run `scripts/download_skills_sh.py` only for leftovers; already-hashed trees are skipped.

## New-id fill 2026-09-18

- Targeted the **495** leftover ids in `meta/sitemap-new-ids-2026-09-18.json` only.
- GitHub fast path: **494** (`fill_skills_sh_from_github.py --ids-file`).
- API drip: **1** (`cursor/plugins/x-mcp-guide` via `download_skills_sh.py --ids-file`).
- New leftovers remaining: **0**.
