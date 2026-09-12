# skills.sh errors

Updated: 2026-09-12T16:46:29Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 2119 have full `files/` + hash. 17843 remain.
At 50 successful downloads/hour this is a multi-day resume job. The downloader is resume-friendly and stays under the cap.

## Permanent misses

36 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `flutter/agent-plugins/flutter-setting-up-on-linux` html_fallback: HTTP 404
- `wondelai/skills/web-typography` rate_limited: HTTP 429 rate_limit_exceeded (60/hour)

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
