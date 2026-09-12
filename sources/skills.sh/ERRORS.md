# skills.sh errors

Updated: 2026-09-12T22:59:17Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19076 have full `files/` + hash. 775 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

147 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `api/git/skill-creator` html_fallback: HTTP 404
- `api/git/generate-design-doc` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
