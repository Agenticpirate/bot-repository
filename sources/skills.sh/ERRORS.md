# skills.sh errors

Updated: 2026-09-12T18:50:11Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 3112 have full `files/` + hash. 16848 remain.
At 50 successful downloads/hour this is a multi-day resume job. The downloader is resume-friendly and stays under the cap.

## Permanent misses

38 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `forcedotcom/sf-skills/omnistudio-flexcard-generate` rate_limited: HTTP 429 rate_limit_exceeded (60/hour)

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
