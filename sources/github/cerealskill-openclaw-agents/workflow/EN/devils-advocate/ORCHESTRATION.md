# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │         Proposer Agent                   │
    │  (produces proposal, plan, or decision)  │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │         Devil's Advocate Agent           │
    │  (challenges, stress-tests, finds holes) │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │         Proposer Agent                   │
    │  (revises or explicitly defends)         │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌──────────────┐
                  │ More rounds? │
                  └──────┬───────┘
                  no     │  yes
        ┌─────────────────┴────────────┐
        ▼                              ▼
    ┌──────────┐              ┌──────────────────┐
    │ Arbiter  │              │ Next challenge   │
    │ decision │              │ round            │
    └──────────┘              └──────────────────┘


## Workflow
Devil's Advocate

## Objective
Strengthen any proposal, plan, architecture, or decision by assigning a dedicated Devil's Advocate agent whose sole job is to find weaknesses, challenge assumptions, and force the Proposer to build a more robust solution.

## Roles
- **Proposer Agent:** produces the initial proposal and defends or revises it after each challenge round.
- **Devil's Advocate Agent:** relentlessly identifies flaws, blind spots, edge cases, and unstated assumptions — without proposing alternatives. Only challenges.
- **Arbiter:** reviews the full transcript and decides whether the proposal is sufficiently hardened or needs another round. Can be a human or a senior agent.

## When to use
- High-stakes proposals: architecture decisions, product specs, investment cases, pricing strategies.
- Decisions where groupthink is a risk (team is too aligned on one approach).
- Before any irreversible commitment.
- Post-incident reviews where "why didn't we think of this?" is a known failure mode.
- Any plan where the author has strong ownership bias.

## Protocol
1. Proposer submits initial proposal with explicit claims, assumptions, and expected outcomes.
2. Devil's Advocate receives the proposal and produces a challenge brief:
   - Weakest assumptions (top 3).
   - Scenarios where the plan fails.
   - Stakeholders or risks not considered.
   - Questions the Proposer cannot yet answer.
3. Proposer responds: revise the proposal or explicitly defend each challenge point with evidence.
4. Devil's Advocate evaluates the response and either:
   - Issues a second wave of challenges (deeper layer).
   - Declares "no further critical objections."
5. Arbiter reviews the full exchange and decides: ship, revise, or escalate.

## Devil's Advocate rules
- Must NOT propose alternatives — only identify problems.
- Must ground every challenge in a realistic scenario, not hypothetical extremes.
- Must challenge assumptions, not just surface details.
- Must not repeat the same objection if it was adequately addressed.
- Must produce at least 3 distinct challenge categories per round.

## Proposer rules
- Must respond to every challenge — no skipping.
- "We'll deal with that later" is not an acceptable defense without a concrete plan.
- Revisions must be explicit: state what changed and why.

## Rules
- Maximum 3 rounds before Arbiter makes a final call.
- Challenge brief and all responses are immutable audit records.
- Arbiter decision must include rationale.

## Deliverables
- Final hardened proposal (with revision history).
- Challenge log: all objections raised and their dispositions (resolved / accepted risk / deferred with plan).
- Arbiter decision with rationale.
- List of explicitly accepted risks.
