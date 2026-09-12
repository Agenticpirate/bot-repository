# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │            Trigger Event                 │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Composer (orchestrator)          │
    │  (reads composition plan + dispatches)    │
    └────┬─────────────┬─────────────┬─────────┘
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │Workflow │  │Workflow  │  │Workflow  │
    │   A     │  │   B      │  │   C      │
    │(triage) │  │(incident)│  │(on-call) │
    └────┬────┘  └────┬─────┘  └────┬─────┘
         │            │             │
         ▼            ▼             ▼
    ┌──────────────────────────────────────────┐
    │     Composer (collect + route)            │
    │  if A=sev1 → B; if A=sev3 → C           │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Selected Workflow                │
    │       (executes to completion)            │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │      Post-workflow (optional)             │
    │  (e.g., weekly-planning for follow-up)    │
    └──────────────────────────────────────────┘


## Workflow
Workflow Composition (meta-orchestration)

## Objective
Combine existing workflow patterns into larger end-to-end processes by chaining, branching, or running them in parallel — reusing proven patterns without reinventing orchestration.

## Roles
- **Composer:** the meta-orchestrator that reads a composition plan and dispatches to individual workflows.
- **Child Workflows:** any existing workflow pattern (triage, incident-mode, feedback-loop, etc.) running as a self-contained unit.
- **Context Shuttle:** carries state and outputs between child workflows.

## When to use
- Complex processes that span multiple existing workflow patterns.
- When you need conditional routing (e.g., triage → incident-mode OR triage → on-call based on severity).
- When workflows must run in parallel and sync at a join point.
- To avoid duplicating orchestration logic that already exists.

## Composition modes

### Sequential
```
Workflow A → Workflow B → Workflow C
```
Output of A feeds into B, output of B feeds into C.

### Conditional
```
Workflow A → if condition_X → Workflow B
           → if condition_Y → Workflow C
```
Route to different workflows based on the outcome of a previous one.

### Parallel + Join
```
Workflow A ──┐
Workflow B ──┼── Join → Workflow D
Workflow C ──┘
```
Run multiple workflows concurrently, wait for all, then feed into the next.

### Loop
```
Workflow A → Workflow B → if !done → Workflow A (repeat)
```
Iterate through a set of workflows until a condition is met.

## Protocol
1. Define a composition plan (sequence of workflows + routing rules).
2. Composer initializes context with the trigger event data.
3. Composer dispatches to the first workflow(s) per the plan.
4. Child workflow runs to completion and returns output + status.
5. Composer evaluates routing rules and dispatches to next workflow(s).
6. Context Shuttle preserves accumulated state across boundaries.
7. Repeat until plan is complete.
8. Composer produces final aggregated output.

## Rules
- Child workflows are black boxes — Composer never reaches into their internals.
- Each child workflow gets a clean context (original input + accumulated outputs).
- Failures in a child workflow follow that workflow's own error handling first.
- If a child workflow fails and cannot self-recover, Composer decides: skip, retry, or abort composition.
- Composition plans are declarative (config/YAML), not imperative code.

## Deliverables
- Composition execution trace (which workflows ran, in what order, with what inputs/outputs)
- Per-workflow status and outputs
- Final aggregated result
- Routing decisions log (why each path was chosen)
