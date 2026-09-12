# ORCHESTRATION.md

## Diagram

    Mon             Wed              Fri
     │               │                │
     ▼               ▼                ▼
    ┌──────────┐  ┌────────────┐  ┌───────────┐
    │ Planning │  │ Checkpoint │  │  Closure  │
    │          │  │            │  │  + Retro  │
    └────┬─────┘  └─────┬──────┘  └───────────┘
         │              │
         ▼              ▼
    ┌──────────┐  ┌────────────┐
    │ Backlog  │  │  Adjust    │
    │ + Assign │  │  Priorities│
    └──────────┘  └────────────┘


## Workflow
Weekly Planning

## Objective
Turn weekly objectives into an executable plan with priorities, capacity, and risks.

## Cadence
- Monday: planning
- Wednesday: checkpoint
- Friday: closure and retro

## Roles
- **Planner:** defines priorities and dependencies.
- **Estimator:** evaluates effort/capacity.
- **Risks:** identifies blockers and contingencies.

## Process
1. Gather candidate backlog.
2. Prioritize (impact x urgency).
3. Estimate real capacity.
4. Confirm weekly commitments.
5. Publish plan with owners.

## Minimum output
- Top priorities
- What is deferred and why
- Risks + plan B
