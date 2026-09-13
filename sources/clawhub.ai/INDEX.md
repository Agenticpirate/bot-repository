# clawhub.ai

OpenClaw official skills registry. Refreshed 2026-09-13T01:52:00Z.
- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).
- `/api/v1/skills` unique slugs: **43969** (pages `000`–`939`; `nextCursor` still live).
- SKILL.md via `/api/v1/skills/{slug}/file?path=SKILL.md`: **43879** (this resume: 21307 attempted + 330 leftover retry; **21217** new bodies; 90 remaining misses; 429=0).
- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).
- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.
- Resume: `PYTHONPATH=scripts python3 -c "from ingest_openclaw_souls import deepen_clawhub; deepen_clawhub()"`.
