# ORCHESTRATION.md

## Diagram

    ┌───────────┐ gate ┌────────┐ gate ┌──────────────┐
    │ Discovery │─────>│ Design │─────>│ Implement.   │
    └───────────┘      └────────┘      └──────┬───────┘
                                              │
                                         gate │
                                              v
                                       ┌────────────┐ gate ┌──────────┐
                                       │ Validation │─────>│ Delivery │
                                       └────────────┘      └──────────┘

    [x] gate fail --> rollback to previous stage

## Workflow
Stage Pipeline

## Objective
Execute work sequentially by stages with quality gates between phases.

## Standard stages
1. **Discovery** (requirements and constraints)
2. **Design** (solution and plan)
3. **Implementation**
4. **Validation** (tests + review)
5. **Delivery**

## Rules
- Do not advance to the next stage without meeting exit criteria.
- Each stage produces a verifiable artifact.
- If a gate fails, rollback to the previous stage.

## Criteria per stage
- Discovery: problem defined + scope closed.
- Design: architecture and risks approved.
- Implementation: complete changes + lint/build OK.
- Validation: test plan executed + evidence.
- Delivery: executive summary + next steps.

## Escalation
- 2 consecutive gate failures => design review.
