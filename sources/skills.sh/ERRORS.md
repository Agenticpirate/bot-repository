# skills.sh errors

Updated: 2026-09-12T21:19:05Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 18558 have full `files/` + hash. 1356 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

84 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `serpdownloaders/skills/udemy-video-downloader` rate_limited: HTTP 429 rate_limit_exceeded (60/hour)

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
