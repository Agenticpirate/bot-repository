---
description: Run the disciplined feature-dev loop on a single feature, fix, or refactor
argument-hint: Optional feature/fix description
---

Handle the following task using the **slicewise** discipline (the bundled `slicewise`
skill has the full detail — follow it):

**Task:** $ARGUMENTS

If no task is given above, ask the user what slice to build before proceeding.

Hold to the four non-negotiable principles throughout:

1. **No auto-commit** — hand off exact, file-disjoint `git` blocks for the user to run on a fresh
   branch; never commit yourself unless told "do it".
2. **Always dual review** — every commit unit gets two independent reviewers in parallel, then a
   reconcile pass. If only one reviewer is available, warn that the invariant is relaxed.
3. **Tests are the ground truth** — build/compile floor per unit, full suite green before anything
   lands, real integration tests (not mocks) for risky changes.
4. **No scope creep** — current issue only; ask before touching anything outside the plan.

Work the phases in order, each as a todo: **read first & report drift → plan file-disjoint commit
units → implement + test gate → dual review + reconcile → re-verify + commit handoff → doc sync +
drift sweep → (if needed) PR/merge unblocking.** Read `.slicewise.yml` if present, otherwise
auto-detect the toolchain and state what you detected.
