# skills.sh errors

Updated: 2026-09-12T20:53:28Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 18362 have full `files/` + hash. 1581 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

55 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `callstack/agent-device/react-devtools` html_fallback: HTTP 404
- `code-yeongyu/oh-my-openagent/github-issue-triage` html_fallback: HTTP 404
- `lijigang/ljg-skills/fix-ljg-org-to-md` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-layout` html_fallback: HTTP 404
- `boshu2/agentops/shared` html_fallback: HTTP 404
- `fearovex-labs/agent-config/image-ocr` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-performance` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
