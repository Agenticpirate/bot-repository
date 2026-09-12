# JOB 2: TITLE GENERATION
## Only run after `02_script/final.md` exists.

---

## Trigger
"Run titles job for video-XXX"

---

## Steps

### Step 1 — Read Final Script
Read `02_script/final.md`. Extract: core topic, key transformation, production angle.

### Step 2 — Generate 3 Titles
Use `jobs/prompts/titles-base.md`.
Write 3 options to `03_titles/draft.md`:
- **Option A — Curiosity/Problem angle**
- **Option B — Result/Outcome angle**
- **Option C — Hinglish/Relatable angle**

Include for each: title text, why it works, predicted CTR strength, weakness.

**[APPROVAL REQUIRED]** — Show the 3 options. Wait for approval or revision notes.

### Step 3 — External Review (only if requested)
Paste titles + video summary into GPT and Gemini for feedback.
Save to `03_titles/gpt_feedback.md` and `03_titles/gemini_feedback.md`.

### Step 4 — Finalize
Write chosen title to `03_titles/final.md`. Update STATUS to `TITLES_FINAL`.
