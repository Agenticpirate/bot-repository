# clawhub.ai

- First SKILL.md pass (pages 000–539 / 24511 slugs): 1945/19564 file-API misses.
- Push-protection redactions (example credentials in public skill docs, not invented):
  - `skills/technews-daily-report/SKILL.md` Feishu `app_id` / `app_secret` / `member_id`
  - `skills/slack-integration/SKILL.md` Slack bot token / signing secret examples
- Pages 540–939 added **19458** more slugs (total **43969**). File-API for those bodies hit a hard fail streak (0 ok / 850+ fail) and was stopped. Resume later via `ingest_openclaw_souls.deepen_clawhub`.
- `nextCursor` still live after page 939.
- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.
