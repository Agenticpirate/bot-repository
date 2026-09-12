# ORCHESTRATION.md

## Diagram

    ┌─────────────────────────────────┐
    │            Splitter             │
    │   (partition input into chunks) │
    └───────┬──────────┬──────────┬───┘
            │          │          │
            v          v          v
       ┌────────┐ ┌────────┐ ┌────────┐
       │Mapper 1│ │Mapper 2│ │Mapper N│
       └───┬────┘ └───┬────┘ └───┬────┘
           │          │          │
           v          v          v
    ┌─────────────────────────────────┐
    │            Reducer              │
    │    (merge partials into final)  │
    └─────────────────────────────────┘

## Workflow
Map-Reduce (split, process in parallel, unify)

## Objective
Decompose a large problem into independent sub-tasks, process them concurrently, and merge results into a coherent output.

## Roles
- **Splitter:** partitions input into chunks with clear boundaries.
- **N Mappers:** each processes one chunk independently.
- **Reducer:** merges all mapper outputs into a single result.

## When to use
- Large datasets or document collections.
- Repetitive analysis across many items.
- Output can be aggregated (counts, summaries, rankings).

## Protocol
1. Splitter defines chunk boundaries and output schema.
2. Each mapper receives its chunk + shared instructions.
3. Mappers produce structured partial results.
4. Reducer collects all partials, resolves conflicts, produces final output.

## Rules
- Chunks must not overlap.
- Every mapper uses the same output schema.
- Reducer must handle missing or malformed partials gracefully.

## Common risks
- Uneven chunk sizes causing bottlenecks.
- Schema drift between mappers.
- Lost context at chunk boundaries.

## Mitigation
- Fixed schema enforced before map phase.
- Overlap margin at chunk edges for context.
- Reducer validates completeness before finalizing.
