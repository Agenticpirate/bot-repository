# skills.sh errors

Updated: 2026-09-12T22:03:28Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 18932 have full `files/` + hash. 952 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

114 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `mosaic/ai/extension-development` html_fallback: HTTP 404
- `mosaic/ai/v2-rest-api-frontend` html_fallback: HTTP 404
- `mosaic/ai/v2-rest-api-backend` html_fallback: HTTP 404
- `mosaic/ai/typescript-unit-tests` html_fallback: HTTP 404
- `mosaic/ai/test-quality-metrics` html_fallback: HTTP 404
- `mosaic/ai/skill-creator` html_fallback: HTTP 404
- `mosaic/ai/react-best-practices` html_fallback: HTTP 404
- `mosaic/ai/mosaic-translation` html_fallback: HTTP 404
- `mosaic/ai/mosaic-frontend-patterns` html_fallback: HTTP 404
- `mosaic/ai/mosaic-backend-patterns` html_fallback: HTTP 404
- `mosaic/ai/device-xml-generator` html_fallback: HTTP 404
- `mosaic/ai/csharp-xml-docs` html_fallback: HTTP 404
- `mosaic/ai/csharp-unit-tests` html_fallback: HTTP 404
- `mosaic/ai/csharp-integration-tests` html_fallback: HTTP 404
- `mosaic/ai/composition-patterns` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
