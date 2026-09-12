# skills.sh errors

Updated: 2026-09-12T20:55:08Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 18444 have full `files/` + hash. 1481 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

73 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `flutter/agent-plugins/flutter-architecture` html_fallback: HTTP 404
- `codestable/codestable/cs-explore` html_fallback: HTTP 404
- `codestable/codestable/cs-learn` html_fallback: HTTP 404
- `codestable/codestable/cs-arch` html_fallback: HTTP 404
- `codestable/codestable/cs-decide` html_fallback: HTTP 404
- `codestable/codestable/cs-libdoc` html_fallback: HTTP 404
- `codestable/codestable/cs-trick` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-caching` html_fallback: HTTP 404
- `codestable/codestable/cs-guide` html_fallback: HTTP 404
- `microsoft/azure-skills/markdown-token-optimizer` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-testing` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
