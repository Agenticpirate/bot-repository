# ORCHESTRATION.md

## Diagram

    ┌───────────┐
    │ Proposer  │──── defines question + options
    └─────┬─────┘
          ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │  Voter 1  │  │  Voter 2  │  │  Voter N  │
    │  (blind)  │  │  (blind)  │  │  (blind)  │
    └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
          │              │              │
          ▼              ▼              ▼
    ┌────────────────────────────────────────┐
    │       Moderator: tally + quorum        │
    └──────────────────┬─────────────────────┘
                       │
               ┌───────┴───────┐
               ▼               ▼
         ┌──────────┐   ┌──────────┐
         │ Majority │   │  Runoff  │
         └──────────┘   └──────────┘


## Workflow
Consensus / Voting (decision by N-agent vote)

## Objective
Reach a collective decision when no single agent has full authority or visibility.

## Roles
- **Proposer:** frames the question and options.
- **N Voters:** each evaluates independently and casts a vote.
- **Moderator:** tallies, detects ties, and declares outcome.

## When to use
- Subjective or high-impact decisions.
- Multiple equally valid perspectives.
- Need to reduce single-agent bias.

## Protocol
1. Proposer defines question, options, and evaluation criteria.
2. Each voter reviews evidence and submits a structured ballot.
3. Moderator collects ballots, checks quorum.
4. Majority wins; ties resolved by weighted criteria or runoff.
5. Dissenting opinions recorded for the record.

## Ballot format
- Choice
- Confidence (high / medium / low)
- Reasoning (1-3 sentences)

## Rules
- Voters must not see each other's ballots before submitting.
- Quorum: at least ⌈N/2⌉ + 1 votes required.
- Abstentions count toward quorum but not toward majority.

## Deliverables
- Final decision with vote tally
- Dissent log
- Criteria used for tie-breaking (if any)
