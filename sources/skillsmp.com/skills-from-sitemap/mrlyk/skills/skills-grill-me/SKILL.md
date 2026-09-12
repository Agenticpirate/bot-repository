---
name: grill-me
description: Interactively grill the user about their plan or design through relentless, structured questioning until every branch of the decision tree is resolved. Use when user explicitly asks to be grilled, stress-tested, or challenged on a plan. Use when users request "grill me", "挑挑毛病", "过一下方案", "方案行不行", "方案靠谱吗", "你觉得怎么样".
---

# Grill Me

Challenge the user's plan or design through relentless questioning.

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

Questions drawn only from what the plan states or what the user flags as undecided will miss two blind spots that live outside the text:

- **Unknown knowns** — standards the user holds but never wrote down because they feel obvious; they surface as "that's not what I meant" only after the build. Restate the plan's implicit assumptions as concrete claims for the user to veto now.
- **Unknown unknowns** — alternatives, risks, and ripple effects the user never considered. Surface what the plan silently excluded.

Rules:
- If a question can be answered by exploring the codebase, explore the codebase instead of asking user.
- Ask 1-2 focused questions per turn. Do not dump all questions at once.
- For each question, state your recommended answer and reasoning, then ask if user agree or have a different take.
- When a branch is resolved, explicitly mark it done and move to the next.
- Keep going until all branches are resolved. Do not stop early or summarize prematurely.