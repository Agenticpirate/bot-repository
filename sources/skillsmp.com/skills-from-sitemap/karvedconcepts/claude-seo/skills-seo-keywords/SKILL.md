---
name: seo-keywords
description: >
  Shopify keyword opportunity research sub-skill. Maps keywords from the
  drinkware keyword database to search intent, difficulty tier, and store
  coverage status. Produces an opportunity table — not scored findings.
  Use when user runs /seo keywords or when seo-audit delegates keyword checks.
---

# SEO Keyword Opportunities

Keyword research sub-skill for Shopify stores. Surfaces keyword opportunities from `drinkware-keywords.md`, mapping each keyword to search intent (transactional/navigational), difficulty tier (High/Medium/Low), and coverage status against the store's crawl data. This is a research companion skill — it does NOT produce PASS/FAIL findings or contribute to the SEO Health Score.

## Quick Reference

| Command | What it does |
|---------|-------------|
| `/seo keywords <url>` | Run keyword opportunity analysis against a Shopify store |
| (via seo-audit) | Receives crawl data from parent orchestrator |

## Context Intake

This skill is invoked by `seo-audit` or directly via `/seo keywords <url>`.

**When invoked by seo-audit:**
- Store URL and crawl data path are provided by the parent — do NOT re-ask
- Read `seo-audit-crawl.json` from the provided path
- Proceed directly to Execution Logic

**When invoked directly:**
- If store URL not provided, read `~/.claude/skills/seo/profiles/karved.json` and use preset
- Run `python3 ~/.claude/skills/seo/scripts/crawl_store.py <url>` to generate crawl data before proceeding
- Save output as `seo-audit-crawl.json` in the current directory
- Then proceed to Execution Logic

## Execution Logic

Execute these steps in order:

1. Read `seo-audit-crawl.json` from the provided path (or current directory if invoked standalone)
2. Load `~/.claude/skills/seo/references/drinkware-keywords.md` — this is the keyword source (required)
3. Parse all keywords from drinkware-keywords.md, organized by their section membership
4. For each keyword, assign **Intent** using the Search Intent Mapping table:

| drinkware-keywords.md Section | Intent |
|-------------------------------|--------|
| Primary Keywords | transactional |
| Secondary Keywords | transactional |
| Long-Tail Keywords | transactional |
| B2B Intent Keywords | transactional |
| Local Intent Keywords | navigational |
| UV Printing Variants | transactional |
| Laser Engraving Variants | transactional |
| B2B and Corporate Variants | transactional |
| Product-Specific Variants | transactional |
| Occasion and Use-Case Variants | transactional |
| Local and Proximity Variants | navigational |

5. For each keyword, assign **Tier** (difficulty proxy) using section membership:

| drinkware-keywords.md Section | Tier |
|-------------------------------|------|
| Primary Keywords | High difficulty |
| Secondary Keywords | Medium difficulty |
| Long-Tail Keywords | Low difficulty |
| B2B Intent Keywords | Low difficulty |
| Local Intent Keywords | Low difficulty |
| UV Printing Variants | Low difficulty |
| Laser Engraving Variants | Low difficulty |
| B2B and Corporate Variants | Low difficulty |
| Product-Specific Variants | Low difficulty |
| Occasion and Use-Case Variants | Low difficulty |
| Local and Proximity Variants | Low difficulty |

6. For each keyword, check **Coverage** against crawl data:
   - For each page in `seo-audit-crawl.json`:
     - Check fields: `title`, `h1`, `meta_description` (case-insensitive substring match)
     - If keyword appears in ANY of these fields on ANY page: `✓ Covered` / Gap = `No`
     - If keyword appears in NONE of these fields on ANY page: `✗ Not covered` / Gap = `Yes`
   - If `meta_description` field is absent from crawl data: fall back to `title` + `h1` only and note at the bottom of output: "Note: meta_description field not available in crawl data — coverage checked against title and H1 only."
   - Requires `meta_description` field in `seo-audit-crawl.json` — provided by `crawl_store.py` (Phase 9)

7. Build the opportunity table with all keywords
8. Write output to `seo-keywords-opportunities.md` in the current directory

## Output Format

Write findings to `seo-keywords-opportunities.md` in the current directory. The output file `seo-keywords-opportunities.md` uses this format:

### Header

```
# Keyword Opportunities

**Store:** {store_url}
**Date:** {audit_date}
**Keywords checked:** {total_count} from drinkware-keywords.md
```

### Opportunity Table

Present High and Medium difficulty keywords in full. For Low difficulty keywords, show only rows where Gap = Yes (uncovered). Summarize covered Low difficulty keywords as a count.

```
## High Difficulty Keywords

| Keyword | Intent | Tier | Current Coverage | Gap |
|---------|--------|------|-----------------|-----|
| custom tumblers | transactional | High difficulty | ✓ Covered | No |
| promotional drinkware | transactional | High difficulty | ✗ Not covered | Yes |
| ... | ... | ... | ... | ... |

## Medium Difficulty Keywords

| Keyword | Intent | Tier | Current Coverage | Gap |
|---------|--------|------|-----------------|-----|
| insulated stainless steel tumbler | transactional | Medium difficulty | ✗ Not covered | Yes |
| ... | ... | ... | ... | ... |

## Low Difficulty Keywords — Gaps Only

| Keyword | Intent | Tier | Current Coverage | Gap |
|---------|--------|------|-----------------|-----|
| UV printing on tumblers | transactional | Low difficulty | ✗ Not covered | Yes |
| ... | ... | ... | ... | ... |

_{N} Low difficulty keywords are covered and not shown._

## Summary

**Total:** {N} keywords checked. {X} gaps identified ({Y} High difficulty, {Z} Medium difficulty, {W} Low difficulty).

> Coverage check: keyword appears in title, H1, or meta description of any store page (case-insensitive substring match).
> Tier = difficulty proxy based on section membership in drinkware-keywords.md.
> Intent derived from Search Intent Mapping in drinkware-keywords.md.
```

**IMPORTANT:** Do NOT include a score line. This is a research companion skill that surfaces opportunities, not scored audit findings. Audit skills (seo-technical, seo-content, etc.) end their output with a weighted score — `seo-keywords-opportunities.md` does not end with a score line.

## Quality Gates

This skill inherits quality gates from `seo/SKILL.md` by reference. No quality gate enforcement is needed — this skill produces opportunity tables, not PASS/WARNING/FAIL findings. The quality gates apply to audit skills only.

## Reference Files

Load these on-demand as needed — do NOT load all at startup.

**Path resolution:** All references are installed at `~/.claude/skills/seo/references/`.

- `references/drinkware-keywords.md` — Required: keyword source with all 11 sections (Primary, Secondary, Long-Tail, B2B Intent, Local Intent, and 6 Karved expansion subsections). Section membership determines tier and intent.
- `references/benchmarks.md` — Optional: load only when additional industry context is needed for opportunity prioritization
