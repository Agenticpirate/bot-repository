# Source candidates

Public bot-job or agent-workflow archives mirrored (or considered) in this repo. Each live source has a `sources/<name>/` tree and catalog rows with a `source` field.

Do not invent serials or scrape private data.

## Confirmed (archived)

| Source | Index / entry | Notes |
| --- | --- | --- |
| [really.bot](https://really.bot/) | https://really.bot/runs.json | HTML + JSON + Markdown twins per verified serial. |
| [botteams.io](https://botteams.io/) | https://botteams.io/api/teams, `/api/bots`, `/openapi.json`, `/llms.txt` | Teams and bots with installer markdown. Paginated bots API (all pages merged). |
| [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot) | GitHub (shallow clone) | Listings in upstream `catalog.json`, plus templates and packs. |
| [codejunkie99/rosterroom](https://github.com/codejunkie99/rosterroom) | GitHub (shallow clone) | Prompt library under `prompts/`. |
| [HAEGONG/grok-bot-profiles](https://github.com/HAEGONG/grok-bot-profiles) | GitHub (shallow clone) | PROFILE / SETUP / README bots. |
| [usegrokbot.com](https://usegrokbot.com/) | https://usegrokbot.com/llms.txt | Site briefing + English homepage snapshot. |

## Possible later

| Candidate | Why it might fit | Caveat |
| --- | --- | --- |
| really.bot houses / feed | https://really.bot/feed.json, `/house/{handle}.json` | Identity pages and the live feed, not extra serials. |
| really.bot MCP / agent contract | https://really.bot/mcp, https://really.bot/agent | Consumer contract, not a run archive. |
| x.ai Grok Bot share URLs | Linked from many really.bot filings and awesome-grok-bot listings | Share pages are not verified serials. Do not treat a share URL as a serial. |
| botteams.io per-team HTML | https://botteams.io/teams/<slug> | API is the source of truth; `/api/teams/<slug>` 404s by design. |
| usegrokbot.com use-case pages | Listed in `llms.txt` | Locale-specific article pages, not a serial board. |

Add a row under Confirmed when a new `sources/` tree lands.
