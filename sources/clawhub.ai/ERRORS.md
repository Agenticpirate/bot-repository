# clawhub.ai

- First SKILL.md pass (pages 000–539 / 24511 slugs): 1945/19564 file-API misses.
- Push-protection redactions (example credentials in public skill docs, not invented):
  - `skills/technews-daily-report/SKILL.md` Feishu `app_id` / `app_secret` / `member_id`
  - `skills/slack-integration/SKILL.md` Slack bot token / signing secret examples
  - Later bodies: Feishu/Lark `cli_a…` / `app_secret`, Tencent `AKID…`, Baidu `bce-v3/ALTAK-…`, DeepSeek/OpenAI-style `sk-…` examples
- Pages 540–939 added **19458** more slugs (total **43969**).
- Final mop-up recovered **89** of the leftover **90**. HTTP 429 this mop-up: **0**.
- Permanent miss (1): `safe-execution` — file API HTTP 200 with empty body; meta has only a summary, no published SKILL.md. Recorded in `meta/skill-md-permanent-misses.json`. Not invented.
- `nextCursor` still live after page 939.
- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.
