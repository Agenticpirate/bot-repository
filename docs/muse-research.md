# Muse research (disambiguation)

Hunt for public **Muse** agent / bot / template galleries, 2026-09-12. There is **no dedicated public Muse Grok bot marketplace** comparable to grokbot.dev, x.ai/bot/marketplace, or skills.sh.

Snapshots (where a page existed) live under `sources/muse-research/`.

## Name collisions

| “Muse” | What it actually is | Agent/bot gallery? |
| --- | --- | --- |
| **Cursor Muse Spark** (`muse-spark-*`) | A Cursor coding-agent model family, not a template site | No |
| **muse.ai** | Video hosting / player product (`https://muse.ai`) | No — unrelated |
| **musetemplates.com** | Timed out this host | Unknown; no snapshot |
| **AgentForge “Muse — Content Machine”** | Single content-agent template at [agentforge.solutions/templates/muse-content-machine](https://agentforge.solutions/templates/muse-content-machine) | One template, not a Muse gallery |
| **ClaudeMarket “Muse — AI Content Creator”** | [claudemarket.ai/marketplace/muse-content-creator](https://www.claudemarket.ai/marketplace/muse-content-creator) | HTTP **429** this host; appears to be one Claude skill/agent listing |
| **Meta Muse Spark** GitHub hits | Unofficial API wrappers / Telegram bots for a “Muse Spark” LLM (e.g. `compnew2006/MetaAI-Free-Hermes-Agent`, `kamellperry/meta-muse-spark-api`) | Not xAI Grok; not a template gallery |
| **alphaparkinc/genpark-meta-muse-*-skill** | Three small “Muse Spark” helper skills (thinking logger, token estimator, multi-app planner) | Skills for a different model, not a Muse bot directory |

## GitHub / web search

Queries: `muse grok bot`, `muse agent template`, `muse-spark`, plus site fetches above.

- `gh search repos "muse grok bot"` → **0** repos
- `gh search repos "muse agent template"` → **0** repos
- `muse-spark` → Cursor/Meta model tooling only (see table)
- No public “awesome-muse-bots”, “muse-grok-templates”, or xAI Muse marketplace surfaced

## What was saved

| Snapshot | HTTP | Notes |
| --- | ---: | --- |
| `sources/muse-research/pages/agentforge-muse-content-machine.html` | 200 | AgentForge content-agent template |
| `sources/muse-research/pages/claudemarket-muse-content-creator.html` | 429 | Rate-limited body only |
| `sources/muse-research/pages/muse-ai.html` | 200 | Video product homepage (negative evidence) |

## Conclusion

Treat **Muse** as a disambiguation problem, not a missing ingest source. If a real Muse Grok / agent-template gallery appears later, add it under `sources/` with a distinct slug and link it from this file. Do not confuse Cursor `muse-spark` model ids or muse.ai video with a bot catalog.
