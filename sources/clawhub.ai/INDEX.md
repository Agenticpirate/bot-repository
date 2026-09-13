# clawhub.ai

OpenClaw official skills registry. List snapshot 2026-09-13T00:28:00Z.
- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).
- `/api/v1/skills` unique slugs: **43969** (pages `000`–`939`; `nextCursor` still live).
- SKILL.md on disk: **22566** from the first 24511 slugs. File-API for slugs after page 539 was rate-limited (stopped).
- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).
- Resume: `PYTHONPATH=scripts python3 -c "from ingest_openclaw_souls import deepen_clawhub; deepen_clawhub()"`.
