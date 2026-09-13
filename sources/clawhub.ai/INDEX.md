# clawhub.ai

OpenClaw official skills registry. Refreshed 2026-09-13T00:11:56Z.
- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).
- `/api/v1/skills` unique slugs: **24511** (pages `000`–`539`; `nextCursor` still live).
- SKILL.md via `/api/v1/skills/{slug}/file?path=SKILL.md`: **22566** (this pass ok=17619 fail=1945).
- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).
- Resume list + missing bodies: `PYTHONPATH=scripts python3 -c "from ingest_openclaw_souls import deepen_clawhub; deepen_clawhub()"`.
