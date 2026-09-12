# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │              Initial Input               │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agent A (enrich + transform)            │
    │  output: input + A's contribution        │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agent B (enrich + transform)            │
    │  output: A's output + B's contribution   │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │  Agent C (enrich + transform)            │
    │  output: B's output + C's contribution   │
    └────────────────────┬─────────────────────┘
                         ▼
                    ┌─────────┐
                    │More     │
                    │agents?  │
                    └────┬────┘
                  no     │   yes
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │  Final       │         │  Agent N     │
    │  Output      │         │  (continue)  │
    └──────────────┘         └──────────────┘


## Workflow
Chain of Thought (sequential enrichment)

## Objective
Process a task through a flexible sequence of agents where each agent enriches the output of the previous one, building up a progressively more complete result.

## Roles
- **Chain agents (A, B, C, … N):** each receives the accumulated output and adds their expertise.
- **Chain Controller:** defines the agent sequence, passes output between agents, and validates the final result.

## When to use
- Tasks that require multiple domains of expertise applied sequentially.
- When the output of one step naturally feeds the next (research → analysis → recommendation → action plan).
- Lighter than stage-pipeline: no quality gates, no formal phases — just sequential enrichment.

## Protocol
1. Chain Controller defines the agent sequence based on the task.
2. Initial input is passed to Agent A.
3. Agent A processes and returns enriched output.
4. Output is passed to Agent B, who adds their contribution.
5. Continue through all agents in sequence.
6. Chain Controller collects final output from last agent.
7. Optional: Controller validates completeness.

## Handoff format
Each agent receives a structured handoff:
- **Original input:** the initial request (always preserved).
- **Chain so far:** accumulated contributions from previous agents.
- **Your role:** what this agent should add.

## Rules
- Each agent must preserve all previous contributions — never discard prior work.
- Each agent must clearly mark what they added (attribution).
- Agents must not go out of scope — only contribute their designated expertise.
- Chain can be reordered without code changes (sequence is configuration, not logic).

## Differences from stage-pipeline
- No quality gates between steps.
- No formal phase definitions (Discovery, Design, etc.).
- Agents enrich rather than transform — accumulation, not replacement.
- More flexible: agents can be added/removed/reordered easily.

## Deliverables
- Final enriched output
- Contribution log (which agent added what)
- Chain execution summary (sequence, timings)
