# skills.sh errors

Updated: 2026-09-12T12:21:57Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 569 have full `files/` + hash. 19418 remain.
At 50 successful downloads/hour this is a multi-day resume job. The downloader is resume-friendly and stays under the cap.

## Permanent misses

11 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `heygen-com/hyperframes/motion-doctrine` html_fallback: HTTP 404
- `heygen-com/hyperframes/captions-overlay` html_fallback: HTTP 404
- `heygen-com/hyperframes/cut-the-curve` html_fallback: HTTP 404
- `heygen-com/hyperframes/seam-craft` html_fallback: HTTP 404
- `heygen-com/hyperframes/changelog-video` html_fallback: HTTP 404
- `heygen-com/hyperframes/oversized-cursor` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
