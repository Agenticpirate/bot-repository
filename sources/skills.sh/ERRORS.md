# skills.sh errors

Updated: 2026-09-12T18:39:23Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 8886 have full `files/` + hash. 11112 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

36 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `serpdownloaders/skills` clone-fail:GraphQL: Could not resolve to a Repository with the name 'serpdownloaders/skills'. (repository): missed 127
- `levnikolaevich/claude-code-skills` github-clone: missed 76

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
