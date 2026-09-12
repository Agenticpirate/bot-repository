# skills.sh errors

Updated: 2026-09-12T16:29:17Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 2006 have full `files/` + hash. 17959 remain.
At 50 successful downloads/hour this is a multi-day resume job. The downloader is resume-friendly and stays under the cap.

## Permanent misses

33 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `flutter/agent-plugins/flutter-interoperating-with-native-apis` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-adding-home-screen-widgets` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-building-plugins` html_fallback: HTTP 404
- `flutter/agent-plugins/flutter-embedding-native-views` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
