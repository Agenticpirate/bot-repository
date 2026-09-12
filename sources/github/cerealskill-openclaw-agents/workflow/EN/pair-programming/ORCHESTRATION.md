# ORCHESTRATION.md

## Diagram

    ┌──────────┐            ┌───────────┐
    │  Driver  │<──────────>│ Navigator │
    │  (code)  │   review   │(strategy) │
    └────┬─────┘            └─────┬─────┘
         │                        │
         v                        v
    ┌──────────┐            ┌───────────┐
    │  Writes  │            │  Reviews  │
    │  code    │            │  in real  │
    │          │            │  time     │
    └────┬─────┘            └─────┬─────┘
         │                        │
         └───────────┬────────────┘
                     v
               ┌───────────┐
               │ Swap roles│
               │ + repeat  │
               └───────────┘

## Workflow
Pair Programming (driver + navigator)

## Objective
Improve quality and reduce defects by having two agents collaborate in real-time on the same task.

## Roles
- **Driver:** writes code/content, focuses on implementation details.
- **Navigator:** reviews in real-time, thinks ahead, catches issues early.

## When to use
- Complex or high-risk changes.
- Knowledge transfer between agents.
- Tasks where mistakes are expensive to fix later.

## Protocol
1. Agree on the goal and approach before starting.
2. Driver implements; navigator reviews continuously.
3. Navigator flags issues, suggests improvements, tracks the plan.
4. Swap roles at regular intervals or natural breakpoints.
5. Both sign off on the final output.

## Rules
- Navigator does not dictate keystrokes — focuses on strategy and correctness.
- Driver explains intent when navigator asks.
- Role swaps are mandatory, not optional.
- Disagreements resolved by quick discussion; if stuck, time-box and escalate.

## Benefits
- Real-time quality gate
- Shared context and knowledge
- Fewer defects reaching review

## Deliverables
- Completed artifact (code, document, config)
- Inline notes from navigator review
- Summary of key decisions made during session
