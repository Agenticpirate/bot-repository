# skills.sh errors

Updated: 2026-09-12T22:02:38Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 18897 have full `files/` + hash. 1002 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

99 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `mosaic/ai/git-commit` html_fallback: HTTP 404
- `api/git/preview-design-doc` html_fallback: HTTP 404
- `codestable/codestable/browser-bridge` html_fallback: HTTP 404
- `api/git/etest-testcase-generate` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
