# skills.sh errors

Updated: 2026-09-12T18:49:24Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 13505 have full `files/` + hash. 6493 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

36 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `elastic/agent-skills` github-clone: missed 29
- `useosint/skills` github-clone: missed 28
- `everyinc/compound-engineering-plugin` github-clone: missed 28
- `bankrbot/claude-plugins` github-clone: missed 34
- `boshu2/agentops` github-clone: missed 39
- `flutter/agent-plugins` github-clone: missed 45
- `nvidia/skills` github-clone: missed 22
- `samuraigpt/generative-media-skills` github-clone: missed 47
- `orchestra-research/ai-research-skills` github-clone: missed 48
- `googleworkspace/cli` github-clone: missed 18
- `101-skills/superpowers` clone-fail:check your internet connection or https://githubstatus.com: missed 16
- `bencium/bencium-marketplace` clone-fail:check your internet connection or https://githubstatus.com: missed 16
- `jezweb/claude-skills` github-clone: missed 63
- `mosaic/ai` clone-fail:GraphQL: Could not resolve to a Repository with the name 'mosaic/ai'. (repository): missed 16
- `encoredev/skills` github-clone: missed 16
- `aaronontheweb/dotnet-skills` github-clone: missed 15
- `postplusai/postplus-skills` github-clone: missed 16
- `refoundai/lenny-skills` github-clone: missed 71
- `levnikolaevich/claude-code-skills` github-clone: missed 76
- `vinvcn/mattpocock-skills-zh-cn` github-clone: missed 15
- `okx/onchainos-skills` github-clone: missed 14
- `forcedotcom/sf-skills` github-clone: missed 85
- `kostja94/marketing-skills` github-clone: missed 100
- `longbridge/skills` github-clone: missed 118

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
