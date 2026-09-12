# skills.sh

Public agent-skills registry (Vercel). Full skill file contents via `GET /api/download/{owner}/{repo}/{slug}` (`{files, hash}`), plus GitHub shallow-clone fill for the rest.

- Last updated: 2026-09-12T18:39:23Z
- Skill URLs in sitemap: 19998
- Unique ids: 19998
- Downloaded OK (files/ + hash): 8886
- Filled via GitHub clone: 6170
- Filled via skills.sh API: 2716
- Permanent API 404 + page HTML fallback: 36
- Failed: 2
- Remaining (no files/ yet): 11112
- API cap: 60 download requests/hour (live `Retry-After: 60`; client budget 50/hour)
- Concurrency: 20 (keep at 1 while capped)

Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.
Per-skill HTML is saved only for permanent download misses (HTTP 404), not for 429s.
Fast path: `scripts/fill_skills_sh_from_github.py` (shallow clone / Git Trees).
Re-run `scripts/download_skills_sh.py` only for leftovers; already-hashed trees are skipped.
