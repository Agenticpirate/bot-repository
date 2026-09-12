# JOB: [Job Name]
## Read `jobs/prompts/[prompt-name].md` before executing this job.

---

## Trigger
"Run [job-name] for [project-name]"

## Prerequisites
<!-- What must exist before this job can run? -->
- [ ] `[previous-step]/final.md` exists
- [ ] STATUS is `[REQUIRED_STATUS]`

---

## Steps

### Step 1 — Read Input
Read `[input-file]` from the project folder.
Extract:
- [What to look for in the input]
- [Key elements to identify]

### Step 2 — Generate Draft
Use `jobs/prompts/[prompt-name].md` as your base prompt.
Write the draft to `[output-path]/draft.md`.
Update STATUS to `[JOB]_DRAFT`.

### Step 3 — [APPROVAL REQUIRED] Show Draft
Tell [YOUR NAME]:
- Draft is ready
- [Key stats about the output — length, sections, etc.]
- Any concerns or gaps noticed in the input

Wait for one of:
- "approve [job]" → skip to Step 5 (finalize)
- "get feedback" → proceed to Step 4
- Notes/revisions → revise draft, stay on Step 3

### Step 4 — External Review (only if requested)
<!-- OPTIONAL: Define your review process -->
<!-- Examples: paste into GPT/Gemini for feedback, send to a reviewer, run a validation -->
- [Review method 1]: Save feedback to `[output-path]/feedback_1.md`
- [Review method 2]: Save feedback to `[output-path]/feedback_2.md`
- Synthesize feedback, revise draft, show changes to [YOUR NAME]

### Step 5 — Finalize
When [YOUR NAME] says "approve [job]":
- Copy `draft.md` content to `final.md`
- Update STATUS to `[JOB]_FINAL`
- Tell [YOUR NAME] what the next available job is

---

## Output Format
<!-- Define the exact structure of the output file -->
```
[Section 1 — Name]
[What goes here]

[Section 2 — Name]
[What goes here]
```

---

## Rules for This Job
<!-- Job-specific rules that override or supplement global rules -->
1. [Rule 1]
2. [Rule 2]
3. [Rule 3]
