# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────┐
    │     Phase 1: Research        │
    │  questions → options → rec.  │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │      Decision Gate           │
    │  (approve before building)   │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │     Phase 2: Execution       │
    │  implement → validate → doc  │
    └──────────────────────────────┘


## Workflow
Research + Execution

## Objective
Clearly separate research and implementation phases to reduce rework.

## Phase 1: Research
- Key questions
- Compared options
- Recommendation with trade-offs
- Decision criteria

## Phase 2: Execution
- Implement approved option
- Validate against success criteria
- Document final decisions

## Rules
- Do not implement without explicit post-research decision.
- Research must bring evidence (docs, benchmarks, references).

## Deliverables
- Technical brief (research)
- Implementation plan
- Result + validation
