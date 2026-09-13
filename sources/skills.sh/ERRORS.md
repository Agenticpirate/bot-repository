# skills.sh errors

Updated: 2026-09-13T00:02:49Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19507 have full `files/` + hash. 311 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

180 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `sickn33/agentic-awesome-skills/research-engineer` html_fallback: HTTP 404
- `api/git/mlog-query` html_fallback: HTTP 404
- `prisma/orm/prisma-8-extension-upgrade` html_fallback: HTTP 404
- `sickn33/agentic-awesome-skills/coding-standards` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
