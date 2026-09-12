# skills.sh

Public agent-skills registry (Vercel). Full skill file contents via `GET /api/download/{owner}/{repo}/{slug}`. Sitemaps and listing pages kept.

- Last updated: 2026-09-12T09:55:11Z
- Skill URLs in sitemap: 19998
- Unique ids: 19998
- Downloaded OK (files/ + hash): 20
- Already present / skipped: 0
- HTML fallback (API failed): 0
- Failed: 0
- Remaining (no successful files/): 19978
- Concurrency: 16
- Cap: target all ~20k; resume-friendly; batch commits on main

Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.
Per-skill HTML is only saved when the download API fails.
