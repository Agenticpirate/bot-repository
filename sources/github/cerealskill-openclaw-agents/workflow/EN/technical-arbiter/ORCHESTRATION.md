# ORCHESTRATION.md

## Diagram

    ┌──────────┐              ┌──────────┐
    │ Agent A  │              │ Agent B  │
    │Proposal 1│              │Proposal 2│
    └────┬─────┘              └────┬─────┘
         │                         │
         └────────────┬────────────┘
                      ▼
               ┌─────────────┐
               │   Arbiter   │
               │  (rubric)   │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │  Decision   │
               │+ justificat.│
               └─────────────┘


## Workflow
Technical Arbiter (2 agents propose, 1 decides)

## Objective
Make robust technical decisions by comparing two independent proposals.

## Roles
- **Agent A:** proposal 1
- **Agent B:** proposal 2
- **Arbiter:** evaluates and decides

## Protocol
1. A and B work independently, without influencing each other.
2. They deliver a standard format:
   - approach
   - pros/cons
   - risk
   - cost/time
3. Arbiter scores using a rubric.
4. Final selection + written justification.

## Suggested Rubric (0-5)
- Technical correctness
- Simplicity
- Maintainability
- Operational risk
- Delivery time

## Closure
- Final decision
- Reasons for discarding
- Conditions for reevaluation
