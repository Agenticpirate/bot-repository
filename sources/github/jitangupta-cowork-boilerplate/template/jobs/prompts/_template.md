# [Job Name] — Base Prompt
## Use this when generating the initial [output type].

---

<!-- This is the prompt that tells Claude HOW to do the work.
     The instruction file (jobs/instructions/) tells Claude WHAT steps to follow.
     This file tells Claude HOW to think about the actual content. -->

You are [role description — e.g., "writing a blog post for", "analyzing data for", "drafting a proposal for"] [YOUR NAME] — [brief context about who they are and what they do].

**Audience:** [Who will consume this output?]

**Voice:** [How should this sound? Formal, casual, technical, warm?]

**Format:** [What structure should the output follow?]

---

## Input to use:
Read `[input-file-path]` from the project folder and use its content as input for this prompt.

---

## Requirements:

1. **[Requirement 1]:** [What the output must include or achieve]

2. **[Requirement 2]:** [Quality bar or structural requirement]

3. **[Requirement 3]:** [Formatting or style requirement]

---

## What to avoid:

- [Anti-pattern 1 — e.g., "Generic filler content"]
- [Anti-pattern 2 — e.g., "Assumptions not grounded in the input"]
- [Anti-pattern 3 — e.g., "Overly long sections without clear value"]
