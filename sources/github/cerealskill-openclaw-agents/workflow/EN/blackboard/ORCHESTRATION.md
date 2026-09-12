# ORCHESTRATION.md

## Diagram

    ┌─────────────────────────────────────────────┐
    │               BLACKBOARD                    │
    │   (shared state: partial results + facts)   │
    └──────┬──────────┬──────────┬────────────────┘
           │read/write│read/write│read/write
           ▼          ▼          ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │ Agent A │ │ Agent B │ │ Agent N │
      │(specialist)│(specialist)│(specialist)│
      └────┬────┘ └────┬────┘ └────┬────┘
           │            │            │
           └────────────┼────────────┘
                        ▼
    ┌─────────────────────────────────────────────┐
    │              Controller                     │
    │    (monitors board, triggers next agent)    │
    └─────────────────────────────────────────────┘


## Workflow
Blackboard

## Objective
Coordinate multiple specialist agents through a shared knowledge space they all read from and write to — without any single agent owning the full solution. The board evolves until a halt condition is met.

## Roles
- **Blackboard (shared state):** central data structure holding all facts, partial results, hypotheses, and metadata. All agents read and write here.
- **Specialist Agents:** independent experts that monitor the board, trigger when their preconditions are met, and post contributions.
- **Controller:** monitors the board state, decides which agent runs next (or runs all eligible agents concurrently), and declares halt when the goal is achieved.

## When to use
- Problems where different types of expertise need to collaborate on a shared evolving solution.
- Complex analysis tasks with no fixed sequence: each contribution unlocks the next expert.
- Scenarios where the solution path is emergent — you can't plan all steps upfront.
- Research synthesis, legal analysis, multi-modal diagnosis, architecture review.

## Protocol
1. Controller initializes the board with the problem statement and known facts.
2. Controller evaluates which agents have their preconditions satisfied.
3. Eligible agents are triggered (sequentially or in parallel based on independence).
4. Each agent reads relevant board entries, does its reasoning, and posts conclusions.
5. Controller checks halt condition after every contribution cycle.
6. If halt not met: return to step 2.
7. If halt met or no agent can contribute: Controller synthesizes final answer from board.

## Board entry format
Each agent writes entries with:
- `author`: agent name.
- `type`: `fact | hypothesis | result | flag | question`.
- `content`: the finding.
- `confidence`: 0–100.
- `dependencies`: list of board entries this was derived from.

## Rules
- Agents must never delete or overwrite existing board entries — only append.
- Controller must prevent infinite loops: same agent cannot trigger on the same unchanged subset twice.
- All writes to the board must be atomic and timestamped.
- Halt conditions must be defined before the board opens.
- If no agent can progress after a full cycle, escalate to a human with the current board state.

## Halt conditions
- Goal entry posted with confidence ≥ threshold.
- All specialist agents have reported no new contributions.
- Maximum iteration limit reached.

## Deliverables
- Final synthesized answer with provenance chain.
- Full board state log (all entries, authors, timestamps).
- Confidence and coverage report per specialist.
