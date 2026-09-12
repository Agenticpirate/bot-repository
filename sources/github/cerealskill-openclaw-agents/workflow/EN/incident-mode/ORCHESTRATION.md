# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │            Incident Declared             │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │Commander │  │  Scribe  │  │  Executors   │
    │ Strategy │  │ Timeline │  │ Mitigations  │
    └────┬─────┘  └────┬─────┘  └──────┬───────┘
         │             │               │
         ▼             ▼               ▼
    ┌──────────────────────────────────────────┐
    │         Periodic Status Updates          │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Closure + Postmortem            │
    └──────────────────────────────────────────┘


## Workflow
Incident Mode (commander + scribe + executors)

## Objective
Resolve incidents quickly, with clear command and complete traceability.

## Roles
- **Incident Commander:** directs strategy and priorities.
- **Scribe:** records timeline, hypotheses, and decisions.
- **Executors:** apply mitigations and verifications.

## Protocol
1. Declare incident + severity.
2. Assign roles immediately.
3. Mitigate impact first, RCA after.
4. Periodic updates (fixed cadence).
5. Closure + postmortem.

## Suggested SLA
- Sev1: updates every 10 min
- Sev2: updates every 20 min
- Sev3: updates every 30-60 min

## Deliverables
- Complete timeline
- Actions and owners
- Preliminary/final RCA
- Prevention plan
