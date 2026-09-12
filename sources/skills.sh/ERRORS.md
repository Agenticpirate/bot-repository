# skills.sh errors

Updated: 2026-09-12T18:43:58Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 11263 have full `files/` + hash. 8735 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

36 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `api/git` clone-fail:GraphQL: Could not resolve to a Repository with the name 'api/git'. (repository): missed 42
- `orchestra-research/ai-research-skills` github-clone: missed 48
- `bankrbot/claude-plugins` github-clone: missed 34
- `camacho/ai-skills` clone-fail:GraphQL: Could not resolve to a Repository with the name 'camacho/ai-skills'. (repository): missed 32
- `akin-ozer/cc-devops-skills` github-clone: missed 31
- `obra/superpowers-skills` clone-fail:check your internet connection or https://githubstatus.com: missed 31
- `jezweb/claude-skills` github-clone: missed 63
- `levnikolaevich/claude-code-skills` github-clone: missed 76
- `refoundai/lenny-skills` github-clone: missed 71
- `forcedotcom/sf-skills` github-clone: missed 85
- `kostja94/marketing-skills` github-clone: missed 100
- `serpdownloaders/skills` clone-fail:GraphQL: Could not resolve to a Repository with the name 'serpdownloaders/skills'. (repository): missed 127
- `longbridge/skills` github-clone: missed 118

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
