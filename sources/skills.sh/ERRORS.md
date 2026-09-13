# skills.sh errors

Updated: 2026-09-13T00:01:13Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19414 have full `files/` + hash. 411 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

173 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `api/git/vip-test-report` html_fallback: HTTP 404
- `dingtalk-real-ai/dingtalk-workspace-cli/dws` html_fallback: HTTP 404
- `api/git/high-sql-code-analyzer` html_fallback: HTTP 404
- `api/git/create-jibi-issue` html_fallback: HTTP 404
- `api/git/ci-fix-skill` html_fallback: HTTP 404
- `api/git/vip-test-analyze` html_fallback: HTTP 404
- `api/git/stability-issue-tracker` html_fallback: HTTP 404
- `api/git/vip-test` html_fallback: HTTP 404
- `api/git/requirement-shift-compare` html_fallback: HTTP 404
- `api/git/vip-test-init` html_fallback: HTTP 404
- `api/git/vip-test-impact` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
