# clawhub.ai

OpenClaw official skills registry. Refreshed 2026-09-13T01:58:55Z.
- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).
- `/api/v1/skills` unique slugs: **43969** (pages `000`–`939`; `nextCursor` still live).
- SKILL.md via `/api/v1/skills/{slug}/file?path=SKILL.md`: **43968**.
- Final mop-up of the leftover **90**: recovered **89** (BOM/plain-text/INI/RTF/JSON-manifest accept, all 409 owners, meta description). Permanent misses: **1**.
- Zip used only as last-resort SKILL.md extract (not a bulk zip archive); none of the leftover 90 needed it.
- Permanent miss (empty published file; not invented): `meta/skill-md-permanent-misses.json` (`safe-execution`, HTTP 200 / 0 bytes).
- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.
- Resume: `PYTHONPATH=scripts python3 -c "from ingest_openclaw_souls import deepen_clawhub; deepen_clawhub()"`.
