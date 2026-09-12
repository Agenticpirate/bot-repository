# ORCHESTRATION.md

## Diagram

    ┌────────────┐                  ┌────────────┐
    │ Core Team  │─── trigger ─────>│ Specialist │
    │  (ongoing) │                  │  (limited) │
    └─────┬──────┘                  └──────┬─────┘
          │                                │
          │       ┌──────────────┐         │
          │       │   Findings   │<────────┘
          │       │ + actionable │
          │       └──────┬───────┘
          │              │
          v              v
    ┌────────────────────────────┐
    │   Plan updated + close    │
    └────────────────────────────┘

## Workflow
On-demand Specialist

## Objective
Activate specialists (legal, finance, docs, security, etc.) only when the case requires it.

## Activation Trigger
- Regulatory/compliance requirement
- Significant financial impact
- Formal external delivery
- High risk not covered by the core team

## Roles
- **Core team:** executes the main path.
- **Specialist:** intervenes for a limited window.

## Rules
- Every activation must state reason + scope.
- Specialist delivers actionable, not generic, findings.
- Close activation once the trigger condition is resolved.

## Deliverable
- Specialist's report
- Changes applied to the plan
