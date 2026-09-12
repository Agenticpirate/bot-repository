# skills.sh errors

Updated: 2026-09-12T22:26:20Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19001 have full `files/` + hash. 876 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

121 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `useosint/skills/breach-data-analysis` html_fallback: HTTP 404
- `useosint/skills/social-media-osint` html_fallback: HTTP 404
- `useosint/skills/reverse-image-search` html_fallback: HTTP 404
- `useosint/skills/geoint-photo` html_fallback: HTTP 404
- `camacho/ai-skills/status` rate_limited: HTTP 429 rate_limit_exceeded (60/hour)

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
