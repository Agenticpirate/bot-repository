# ORCHESTRATION.md

## Diagram

                    ┌───────────────┐
                    │      Hub      │
                    │ (Orchestrator)│
                    └──┬────┬────┬──┘
                       │    │    │
              ┌────────┘    │    └────────┐
              ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │   Spoke   │ │   Spoke   │ │   Spoke   │
        │Implement. │ │Validation │ │   Docs    │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    ┌───────────────┐
                    │  Hub merges   │
                    │  + publishes  │
                    └───────────────┘


## Workflow
Hub-and-spoke

## Objective
Centralize coordination in a hub (orchestrator) and delegate execution to spokes (specialist agents), minimizing misalignment.

## Roles
- **Hub / Orchestrator:** prioritizes, divides, integrates, decides trade-offs.
- **Implementation Spoke:** builds the solution.
- **Validation Spoke:** testing, QA, compliance.
- **Documentation Spoke:** runbook/changelog/delivery.

## When to use
- Multiple work fronts with dependency on a single technical direction.
- Need for strong control of scope and quality.

## Operating policy
1. Hub defines backlog in atomic tasks.
2. Each spoke takes 1-2 tasks with explicit owner.
3. Everything returns to the hub for integration.
4. Hub publishes consolidated status by milestones.

## Suggested SLA
- Operational update every 60-90 min.
- Blockage >30 min => escalate to hub.

## Deliverables
- Consolidated plan
- Integrated result
- Risks + mitigations
- Recorded technical decisions
