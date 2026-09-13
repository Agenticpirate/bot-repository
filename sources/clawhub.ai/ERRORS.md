# clawhub.ai

- First SKILL.md pass (pages 000–539 / 24511 slugs): 1945/19564 file-API misses.
- Push-protection redactions (example credentials in public skill docs, not invented):
  - `skills/technews-daily-report/SKILL.md` Feishu `app_id` / `app_secret` / `member_id`
  - `skills/slack-integration/SKILL.md` Slack bot token / signing secret examples
  - Later bodies: Feishu/Lark `cli_a…` / `app_secret`, Tencent `AKID…`, Baidu `bce-v3/ALTAK-…`, DeepSeek/OpenAI-style `sk-…` examples
- Pages 540–939 added **19458** more slugs (total **43969**). A previous file-API pass for those bodies hit a hard fail streak and was stopped.
- This resume filled **21217** additional SKILL.md (22566 → 43879). Leftover misses: **90** (mostly HTTP 404 / empty-or-non-markdown 200 / transient HTTP 0). HTTP 429 count this resume: **0**.
- `nextCursor` still live after page 939.
- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.
- Miss list: `meta/skill-md-misses.json`.
