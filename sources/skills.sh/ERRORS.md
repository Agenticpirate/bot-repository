# skills.sh errors

Updated: 2026-09-12T22:58:27Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 19028 have full `files/` + hash. 825 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

145 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `useosint/skills/osint-investigation` html_fallback: HTTP 404
- `useosint/skills/sockpuppet-opsec` html_fallback: HTTP 404
- `useosint/skills/crypto-blockchain-tracing` html_fallback: HTTP 404
- `useosint/skills/email-osint` html_fallback: HTTP 404
- `useosint/skills/corporate-registries` html_fallback: HTTP 404
- `useosint/skills/chronolocation` html_fallback: HTTP 404
- `useosint/skills/person-osint` html_fallback: HTTP 404
- `useosint/skills/people-search-engines` html_fallback: HTTP 404
- `useosint/skills/flight-vessel-tracking` html_fallback: HTTP 404
- `useosint/skills/exif-metadata-analysis` html_fallback: HTTP 404
- `useosint/skills/domain-osint` html_fallback: HTTP 404
- `useosint/skills/whois-dns-recon` html_fallback: HTTP 404
- `useosint/skills/wayback-archives` html_fallback: HTTP 404
- `useosint/skills/paste-forum-monitoring` html_fallback: HTTP 404
- `useosint/skills/osint-report` html_fallback: HTTP 404
- `useosint/skills/media-verification` html_fallback: HTTP 404
- `useosint/skills/github-git-recon` html_fallback: HTTP 404
- `useosint/skills/username-osint` html_fallback: HTTP 404
- `useosint/skills/phone-osint` html_fallback: HTTP 404
- `useosint/skills/company-osint` html_fallback: HTTP 404
- `useosint/skills/shodan-censys-recon` html_fallback: HTTP 404
- `useosint/skills/link-analysis-graphing` html_fallback: HTTP 404
- `useosint/skills/google-dorking` html_fallback: HTTP 404
- `useosint/skills/certificate-transparency` html_fallback: HTTP 404

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
