# skills.sh

Public agent-skills registry (Vercel). Full skill file contents via `GET /api/download/{owner}/{repo}/{slug}` (`{files, hash}`).

- Last updated: 2026-09-12T18:00:27Z
- Skill URLs in sitemap: 19998
- Unique ids: 19998
- Downloaded OK (files/ + hash): 2695
- Permanent API 404 + page HTML fallback: 36
- Failed: 0
- Remaining (no files/ yet): 17267
- API cap: 60 download requests/hour (live `Retry-After: 60`; client budget 50/hour)
- Concurrency: 1 (keep at 1 while capped)

Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.
Per-skill HTML is saved only for permanent download misses (HTTP 404), not for 429s.
Re-run `scripts/download_skills_sh.py` to resume; already-hashed trees are skipped.
