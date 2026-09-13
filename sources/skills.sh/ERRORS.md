# skills.sh errors

Updated: 2026-09-13T00:07:25Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19702 have full `files/` + hash. 111 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

185 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `api/git/java-snapshot-check` html_fallback: HTTP 404
- `labring/sealos-skills/k8s-kaniko-job` html_fallback: HTTP 404
- `api/git/sprint-issue-validator` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
