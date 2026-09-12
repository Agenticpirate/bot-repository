# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │              Initial Input               │
    └────────────────────┬─────────────────────┘
                         ▼
              ┌──────────────────┐
              │   Draft Agent    │
              │  (produce v1)    │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Review Agent    │
              │ (evaluate + score│
              │  against rubric) │
              └────────┬─────────┘
                       ▼
                  ┌──────────┐
                  │Converged?│
                  └────┬─────┘
              no       │     yes
         ┌─────────────┴─────────────┐
         ▼                           ▼
    ┌──────────────┐       ┌──────────────────┐
    │  Feedback    │       │  Final Delivery  │
    │  (specific   │       └──────────────────┘
    │   fixes)     │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Draft Agent │
    │  (revise)    │──── loop back to Review
    └──────────────┘


## Workflow
Feedback Loop (iterative refinement)

## Objective
Produce high-quality output through iterative cycles of drafting and reviewing until convergence criteria are met, without a fixed hierarchy.

## Roles
- **Draft Agent:** produces and revises work based on feedback.
- **Review Agent:** evaluates output against a rubric, scores quality, provides actionable feedback.
- **Convergence Monitor:** tracks iteration count and quality scores to prevent infinite loops.

## When to use
- Creative or analytical output that benefits from refinement (docs, code, proposals).
- When quality is hard to get right on the first attempt.
- Tasks where incremental improvement is more effective than a single pass.

## Protocol
1. Draft Agent produces initial version (v1).
2. Review Agent evaluates against rubric and assigns a quality score (0–100).
3. If score ≥ threshold (configurable, default 85) → deliver.
4. If score < threshold → Review Agent provides specific, actionable feedback.
5. Draft Agent revises based on feedback → produces v(n+1).
6. Repeat from step 2.
7. If max iterations reached without convergence → deliver best version with quality disclaimer.

## Convergence criteria
- **Quality threshold:** 85/100 (configurable)
- **Max iterations:** 5 (prevents infinite loops)
- **Improvement floor:** if score improves < 3 points between iterations, stop early (diminishing returns)

## Rules
- Feedback must be specific and actionable (no vague "make it better").
- Each iteration must reference what changed from previous version.
- Review Agent must not rewrite — only evaluate and guide.
- All versions preserved for comparison.

## Deliverables
- Final output (best version)
- Iteration log (version, score, feedback summary)
- Convergence report (iterations used, score trajectory)
