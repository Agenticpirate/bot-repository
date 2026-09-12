# JOB 1: SCRIPT GENERATION
## Read `jobs/prompts/script-base.md` before executing this job.

---

## Trigger
"Run script job for video-XXX"

---

## Steps

### Step 1 — Read Input
Read `01_input/input.md` from the video folder.
Extract:
- Video topic and goal
- Bullet points (what to teach)
- Demo points (what screen sections to show)
- Any tone/style notes

### Step 2 — Generate Draft Script
Use `jobs/prompts/script-base.md` as your base prompt.
Write the draft to `02_script/draft.md`.
Update STATUS to `SCRIPT_DRAFT`.

### Step 3 — [APPROVAL REQUIRED] Show Draft to Jitan
Tell Jitan:
- Draft is ready
- Estimated video length
- How many demo sections
- Any concerns or gaps noticed in the input

Wait for one of:
- "approve script" → skip to Step 5 (finalize)
- "get feedback" → proceed to Step 4
- Notes/revisions → revise draft, stay on Step 3

### Step 4 — External Review (only if requested)
**GPT Review:**
- Go to chat.openai.com, paste reviewer prompt + full draft
- Save response to `02_script/gpt_feedback.md`

**Gemini Review:**
- Go to gemini.google.com, paste same content
- Save response to `02_script/gemini_feedback.md`

Synthesize feedback, revise draft, show changes to Jitan. **[APPROVAL REQUIRED]**

### Step 5 — Finalize
When Jitan says "approve script":
- Copy `draft.md` content to `final.md`
- Update STATUS to `SCRIPT_FINAL`
- Tell Jitan: "Script finalized. Say 'Run titles job for video-XXX' when ready."

---

## Script Structure

```
[HOOK] — 0:00 to ~0:45
[INTRO/PROMISE] — What they'll learn, why it matters
[SECTION 1 — Concept] — Talking head explaining the concept
[DEMO 1] — Screen recording (what to show, what to highlight)
[SECTION 2 — ...] — Continue pattern
[KEY INSIGHT] — Connect to real production impact
[OUTRO/CTA] — Subscribe, comment, link to related video
```
