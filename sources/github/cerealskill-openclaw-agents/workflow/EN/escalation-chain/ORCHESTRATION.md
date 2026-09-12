# ORCHESTRATION.md

## Diagram

    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │    L1    │─────>│    L2    │─────>│    L3    │
    │ Routine  │      │ Advanced │      │  Expert  │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                 │                  │
         v                 v                  v
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │Resolved? │      │Resolved? │      │Resolved? │
    │  Yes [+] │      │  Yes [+] │      │  Yes [+] │
    └──────────┘      └──────────┘      └──────────┘

    <--- Escalation Controller (SLA watch) --->

## Workflow
Escalation Chain (progressive level escalation)

## Objective
Route issues through increasingly capable or authoritative tiers until resolution.

## Roles
- **L1 Agent:** first responder, handles known patterns.
- **L2 Agent:** deeper diagnosis, broader tooling.
- **L3 Agent:** specialist, access to root systems.
- **Escalation controller:** monitors SLA and triggers promotion.

## When to use
- Support or ops with tiered expertise.
- Need to protect senior capacity from routine work.

## Protocol
1. L1 receives and attempts resolution within SLA window.
2. If unresolved or out of scope, escalate to L2 with context summary.
3. L2 repeats; escalate to L3 if needed.
4. Each tier adds findings to a shared ticket.
5. Resolution confirmed at originating tier.

## Rules
- Never skip tiers without explicit override.
- Each escalation must include: what was tried, what failed, relevant evidence.
- De-escalation is allowed once root cause is identified.

## Deliverables
- Resolution record with tier trail
- Time-per-tier metrics
- Escalation reason log
