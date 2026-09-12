# Daily Community Scout — Scheduled Task Prompt

## Your Job
Search LinkedIn, Reddit, and X for recent posts (last 24 hours) about Claude's product ecosystem and competitor comparisons. For each post worth engaging with, produce an enriched engagement brief. After all posts are processed, run a validation pass and optionally draft 1-2 original LinkedIn posts.

## Shared Context
Before executing, read ALL config files:
- `config/profile.md` — who I am, experience pool, ethics rule
- `config/rules.md` — quality filter, engagement styles, banned patterns
- `config/content-types.md` — post types for engaging + creating

---

## PHASE 1: Search & Collect

### Search Strategy

**LinkedIn:** Search "Claude Code", "Claude Cowork", "Claude AI", "Claude vs Cursor" — filtered to Posts, sorted by Latest. Scan 10-15 results per query. Capture 3-7 relevant posts.

**Reddit:** Search r/ClaudeAI (sort by New), plus keyword searches for "Claude Code", "Claude vs" across relevant subreddits. Capture 5-10 posts.

**X/Twitter:** Search "Claude Code", "Claude Cowork", "@AnthropicAI" — all with `-is:retweet`. Capture 5-10 posts.

**Every post MUST have a clickable direct link.** A post without a link is useless.

---

## PHASE 2: Filter & Classify

For every post:
1. Apply quality filter from `config/rules.md`
2. Classify engagement type (1-5 from `config/content-types.md`)
3. Note any buyer persona signals

---

## PHASE 3: Draft Enriched Engagement Briefs

For each kept post:

```
### [Post Title/Topic]
- **Platform:** LinkedIn / Reddit / X
- **Author:** [name/handle]
- **Link:** [FULL URL]
- **About:** [2-3 sentence summary]
- **Engagement Value:** High / Medium / Low

#### Engagement Strategy [Style tag: Experience / Curious / Tip / Validate]
**Why this approach:** [reasoning]
**Key assumptions:** [what you're assuming]
**Draft response:** [ready to copy-paste]
**What NOT to do:** [post-specific guardrails]
```

---

## PHASE 4: Validation Pass

1. **Style Distribution:** If [Experience] > 40%, rebalance
2. **Experience Rotation:** No single experience point in > 1 of every 5 responses
3. **Negative Posts:** Must lead with validation, not solutions
4. **Ethics:** No employer references
5. **Banned Words:** Check against rules

---

## PHASE 5: Original Post Ideas

If strong themes emerge, draft 1-2 LinkedIn posts. Score each (Hook, Value, Clarity, Authenticity, CTA — each /10). Only include if total >= 28/50.

---

## Save output to `scheduled/output/community-scout/YYYY-MM-DD.md`
