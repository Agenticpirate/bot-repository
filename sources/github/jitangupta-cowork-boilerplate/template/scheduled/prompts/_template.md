# [Task Name] — Scheduled Task Prompt

## Your Job
[One-paragraph description of what this task does when it runs.]

## Shared Context
Before executing, read ALL config files for shared context:
- `config/profile.md` — who I am, expertise, ethics rules
- `config/rules.md` — quality standards and guardrails
- `config/resources.md` — tools, links, references

---

## PHASE 1: [Gather / Search / Collect]
<!-- What data or input does this task need? Where does it come from? -->

[Describe what to collect, where to find it, and how to filter it.]

---

## PHASE 2: [Filter / Classify / Analyze]
<!-- How should the collected data be processed? -->

[Describe the analysis, classification, or filtering logic.]

---

## PHASE 3: [Draft / Generate / Produce]
<!-- What is the actual output this task creates? -->

[Describe the output format and what it should contain.]

---

## PHASE 4: [Validate / Review]
<!-- Quality checks before saving -->

[Describe validation steps — fact-checking, rule compliance, quality scoring, etc.]

---

## OUTPUT FORMAT

Save the output as a markdown file at `scheduled/output/[task-name]/YYYY-MM-DD.md`.

```markdown
# [Task Name] — [Today's Date]

## Summary
[Key stats and highlights]

---

## [Main Content Section]
[Output content here]

---

## Validation Report
[Results of Phase 4 checks]
```

---

## If Something Fails
- [What to do if a data source is unavailable]
- [What to do if no results meet the quality bar]
- Never fabricate or hallucinate data. Empty output is valid and honest.
