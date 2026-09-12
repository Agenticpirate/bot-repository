# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │              Dispatcher                  │
    │   (broadcast same task to all solvers)   │
    └──────┬──────────┬──────────┬─────────────┘
           │          │          │
           ▼          ▼          ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │Solver 1 │ │Solver 2 │ │Solver N │
      │(attempt)│ │(attempt)│ │(attempt)│
      └────┬────┘ └────┬────┘ └────┬────┘
           │            │            │
           └────────────┼────────────┘
                        ▼
    ┌──────────────────────────────────────────┐
    │               Aggregator                 │
    │   (score + select best / merge results)  │
    └──────────────────────────────────────────┘


## Workflow
Scatter-Gather

## Objective
Broadcast the same task to multiple independent solvers simultaneously, then score and select the best answer (or merge the best parts). Maximizes quality when single-agent output is unreliable or when diverse approaches improve coverage.

## Roles
- **Dispatcher:** formulates the task and broadcasts it identically to all solvers.
- **Solvers (N agents):** each independently attempts the full task using their own approach, persona, or model.
- **Aggregator:** receives all responses, scores them against defined criteria, and returns the winner or a synthesized composite.

## When to use
- High-stakes outputs where quality matters more than speed (critical copy, architecture decisions, legal drafts).
- Tasks where diversity of approach improves coverage (red-flag detection, research synthesis).
- When a single agent is likely to miss edge cases or make systematic errors.
- A/B testing different agent configurations on real work.

## Protocol
1. Dispatcher defines the task with explicit output requirements and scoring criteria.
2. Task is broadcast to all N solvers simultaneously.
3. All solvers produce independent responses without seeing each other's work.
4. Aggregator receives all N responses.
5. Aggregator scores each response using the criteria defined in step 1.
6. Aggregator selects best single response OR synthesizes a composite using strengths from each.
7. Aggregator produces final output + scoring rationale + dissent summary.

## Scoring criteria (configurable)
- Accuracy / correctness
- Completeness (coverage of requirements)
- Conciseness (no padding or redundancy)
- Risk flags identified
- Adherence to format/constraints

## Rules
- Solvers must be isolated — no cross-contamination of outputs during generation.
- Dispatcher task brief must be identical for all solvers.
- Aggregator must document why the winner was selected (or how the composite was built).
- Minimum N = 2; recommended N = 3 for most tasks.
- If all solvers produce low-confidence outputs, escalate rather than picking the least-bad one.

## Deliverables
- Final selected or composite answer.
- Scoring matrix for all N responses.
- Dissent log: meaningful differences between solvers worth noting.
- Recommended N for similar future tasks.
