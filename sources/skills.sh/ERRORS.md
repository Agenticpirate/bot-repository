# skills.sh errors

Updated: 2026-09-12T18:53:44Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 15968 have full `files/` + hash. 4030 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

30 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `railwayapp/railway-skills` github-clone: missed 13
- `encoredev/skills` github-clone: missed 16
- `okx/onchainos-skills` github-clone: missed 14
- `googleworkspace/cli` github-clone: missed 18
- `get-convex/agent-skills` github-clone: missed 10
- `apify/agent-skills` github-clone: missed 10
- `404kidwiz/claude-supercode-skills` clone-fail:GraphQL: Could not resolve to a Repository with the name '404kidwiz/claude-supercode-skills'. (repository): missed 8
- `ehmo/platform-design-skills` github-clone: missed 8
- `bankrbot/claude-plugins` github-clone: missed 34
- `aj-geddes/claude-code-bmad-skills` github-clone: missed 7
- `bradsjm/hassio-addons` github-clone: missed 7
- `ghostsecurity/skills` github-clone: missed 7
- `novuhq/skills` github-clone: missed 7
- `wordflowlab/novel-writer-skills` github-clone: missed 7
- `different-ai/openwork` github-clone: missed 6
- `google/adk-docs` github-clone: missed 6
- `partme-ai/full-stack-skills` github-clone: missed 6
- `nextlevelbuilder/ui-ux-pro-max-skill` github-clone: missed 6
- `libukai/awesome-agent-skills` github-clone: missed 5
- `styleof/superpowers` clone-fail:GraphQL: Could not resolve to a Repository with the name 'styleof/superpowers'. (repository): missed 5
- `runcomfy-com/skills` github-clone: missed 5
- `cometchat/cometchat-skills` clone-fail:check your internet connection or https://githubstatus.com: missed 4
- `terrylica/cc-skills` clone-fail:failed to run git: exit status 128: missed 5
- `wubing2023/paperspine` github-clone: missed 5
- `alphaonedev/openclaw-graph` clone-fail:GraphQL: Could not resolve to a Repository with the name 'alphaonedev/openclaw-graph'. (repository): missed 3
- `senpi-ai/senpi-skills` github-clone: missed 4
- `levnikolaevich/claude-code-skills` github-clone: missed 76

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
