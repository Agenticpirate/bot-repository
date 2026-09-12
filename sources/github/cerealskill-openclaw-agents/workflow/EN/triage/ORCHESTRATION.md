# ORCHESTRATION.md

## Diagram

    ┌───────────┐      ┌───────────┐      ┌──────────┐
    │  Request  │─────>│  Triage   │─────>│  Router  │
    │  (raw)    │      │  Agent    │      │          │
    └───────────┘      └───────────┘      └────┬─────┘
                                               │
                       ┌───────────────────────┼───────────┐
                       v                       v           v
                  ┌─────────┐           ┌──────────┐ ┌─────────┐
                  │Handler A│           │Handler B │ │Handler C│
                  │ (bugs)  │           │(features)│ │(support)│
                  └─────────┘           └──────────┘ └─────────┘

## Workflow
Triage (classify, prioritize, route)

## Objective
Quickly categorize incoming work and route it to the right handler with correct priority.

## Roles
- **Triage agent:** classifies and prioritizes.
- **Router:** assigns to the correct queue or agent.
- **Handlers:** domain-specific agents that execute.

## When to use
- High volume of heterogeneous incoming requests.
- Need consistent prioritization criteria.
- Multiple specialized teams or agents downstream.

## Protocol
1. Triage agent receives raw request.
2. Classify by type (bug, feature, question, incident, etc.).
3. Assign priority (P0-P3) using defined criteria.
4. Router sends to appropriate handler queue.
5. Handler acknowledges receipt within SLA.

## Priority criteria
| Priority | Description | Response SLA |
|----------|-------------|--------------|
| P0 | Critical / outage | Immediate |
| P1 | High impact, workaround exists | < 1 hour |
| P2 | Medium, no urgency | < 4 hours |
| P3 | Low / informational | Best effort |

## Rules
- Every request gets a classification — no silent drops.
- Ambiguous requests default to P2 and flag for human review.
- Re-triage allowed if new information surfaces.

## Deliverables
- Classification record per request
- Routing log
- Triage accuracy metrics over time
