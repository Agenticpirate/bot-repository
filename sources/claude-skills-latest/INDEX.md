# Latest Claude skills (60-day window)

Window: **2026-07-14 → 2026-09-12** (60 days ending 2026-09-12). Refreshed **2026-09-12T13:36:15Z**.

Skillselion filter (`createdAt` **or** `updatedAt` ≥ 2026-07-14, `tool=claude_code`): **60442** metadata rows in `meta/skillselion-recent.json`.

`updatedAt` is a Skillselion reindex stamp (most rows 2026-09-05..07), so the OR-filter matches the entire live catalog. True `createdAt` in-window: **2378** (`meta/skillselion-created-recent.json`).

| Count | Value |
| --- | ---: |
| Recent metadata (N) | 60442 |
| Downloaded / has_content (M) | 11049 |
| Metadata-only / failed (F) | 51767 |
| SKILL.md files on disk | 15795 |
| createdAt-in-window with files | 1466 / 2378 |
| Priority keys with files (createdAt + hot + trending + SOTD) | 1794 / 2668 |

Content sources: reused `sources/skills.sh` (1563), maintained repos (2238 unique slugs), GitHub clones (228 ok / 18 fail, 10697 extracted), skills.sh download API this pass (68 ok / 41 fail / 833 skipped; 60/hour cap).

Also snapshotted: skills.sh `pages/hot.html` + `pages/trending.html` (197 / 181 paths), ClaudSkills sitemap-news + 44 `/sotd/` pages + 47 skill pages, `meta/claude-com-plugins.html`.

Maintained repos (full trees): anthropics/skills, alirezarezvani/claude-skills, obra/superpowers, davila7/claude-code-templates, ComposioHQ/awesome-claude-skills.

Does not replace the historical `sources/skills.sh` dump. Catalog `source`: `claude-skills-latest`.
