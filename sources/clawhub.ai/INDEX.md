# clawhub.ai

OpenClaw official skills registry. List snapshot 2026-09-12T23:20:00Z.
- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).
- `/api/v1/skills` unique slugs: **24511** (pages `000`–`539`; `nextCursor` still live — resume via `scripts/ingest_openclaw_souls.py`).
- SKILL.md via `/api/v1/skills/{slug}/file?path=SKILL.md` still downloading the missing ~19.5k (first pass had **4947**).
- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).
