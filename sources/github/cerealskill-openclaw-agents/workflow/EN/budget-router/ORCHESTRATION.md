# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │            Incoming Task                 │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Budget Router                   │
    │  (classify task complexity + cost)        │
    └────────────────────┬─────────────────────┘
                         ▼
              ┌──────────────────┐
              │  Task tier?      │
              └────┬──────┬──────┘
            low    │  mid │  high
         ┌─────────┼──────┼──────────┐
         ▼         ▼      ▼          │
    ┌─────────┐ ┌──────┐ ┌────────┐  │
    │  Lite   │ │ Mid  │ │Premium │  │
    │  Agent  │ │Agent │ │ Agent  │  │
    │(fast/   │ │(bal- │ │(best   │  │
    │ cheap)  │ │anced)│ │quality)│  │
    └────┬────┘ └──┬───┘ └───┬────┘  │
         │         │         │       │
         ▼         ▼         ▼       │
    ┌──────────────────────────────┐ │
    │  Quality Gate (spot-check)   │ │
    └──────────────┬───────────────┘ │
              pass │   fail          │
         ┌─────────┴─────────┐       │
         ▼                   ▼       │
    ┌──────────┐    ┌──────────────┐ │
    │ Deliver  │    │ Escalate to  │─┘
    └──────────┘    │ higher tier  │
                    └──────────────┘


## Workflow
Budget Router (cost-optimized task routing)

## Objective
Route tasks to the most cost-efficient agent capable of handling them, using expensive/powerful agents only when the task complexity justifies it.

## Roles
- **Budget Router:** classifies incoming tasks by complexity and routes to the appropriate tier.
- **Lite Agent:** handles simple, routine tasks (fast model, low cost).
- **Mid Agent:** handles moderate complexity (balanced model).
- **Premium Agent:** handles complex, high-stakes tasks (best model, highest cost).
- **Quality Gate:** spot-checks outputs to ensure the chosen tier was adequate.

## When to use
- High-volume task processing where cost matters.
- Mixed workloads with varying complexity (support tickets, code reviews, content).
- When you have agents backed by different models (e.g., GPT-4o-mini vs Claude Opus).
- Budget-constrained environments that still need quality guarantees.

## Protocol
1. Task arrives at Budget Router.
2. Router classifies task complexity using heuristics:
   - **Low:** templated, lookup, simple Q&A, formatting.
   - **Mid:** analysis, summarization, moderate reasoning.
   - **High:** multi-step reasoning, creative, ambiguous, high-stakes.
3. Router dispatches to the corresponding agent tier.
4. Agent executes and returns result.
5. Quality Gate spot-checks a sample of results (configurable % per tier).
6. If quality fails → escalate to next higher tier and re-execute.
7. Track routing accuracy and adjust classification heuristics over time.

## Tier definitions (example)
| Tier    | Model example       | Cost | Speed  | Use for                        |
|---------|---------------------|------|--------|--------------------------------|
| Lite    | GPT-4o-mini, Haiku  | $    | Fast   | Templated, lookup, formatting  |
| Mid     | GPT-4o, Sonnet      | $$   | Medium | Analysis, summarization        |
| Premium | Claude Opus, o1     | $$$  | Slow   | Complex reasoning, high-stakes |

## Quality gate
- **Spot-check rate:** 20% of Lite, 10% of Mid, 5% of Premium
- **Evaluation:** automated rubric or a Premium agent reviewing the output
- **Escalation:** if quality < threshold, re-route to next tier

## Rules
- Always start at the lowest tier that could handle the task (optimize for cost).
- Never skip tiers during escalation (Lite → Mid → Premium, not Lite → Premium).
- Track cost per task and cost savings vs. all-Premium baseline.
- Classification heuristics are living rules — update based on escalation patterns.
- Human override: users can force a specific tier for critical tasks.

## Metrics
- **Routing accuracy:** % of tasks that pass Quality Gate at first tier
- **Cost savings:** actual spend vs. all-Premium baseline
- **Escalation rate:** % of tasks that needed tier upgrade
- **Average latency:** per tier

## Deliverables
- Task routing log (task, classification, tier, result, quality score)
- Cost report (per tier, total, savings)
- Escalation report (which tasks needed upgrade and why)
- Classification accuracy trends
