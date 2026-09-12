# ORCHESTRATION.md

## Diagram

    ┌──────────┐  handoff  ┌──────────┐  handoff  ┌──────────┐
    │ Block A  │─────────▶│ Block B  │─────────▶│ Block C  │
    │ Execute  │          │ Continue │          │  Close   │
    └──────────┘          └──────────┘          └──────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │ Handoff  │          │ Handoff  │          │  Final   │
    │  Report  │          │  Report  │          │  Report  │
    └──────────┘          └──────────┘          └──────────┘


## Workflow
Follow-the-sun (handoff by blocks)

## Objective
Maintain continuous progress through structured handoffs between agents by time blocks.

## Blocks
- **Block A:** initial execution
- **Block B:** continuity + validation
- **Block C:** closure/documentation

## Mandatory handoff format
- Current status
- Achievements
- Pending tasks
- Blockers
- Next recommended first step

## Rules
- Without a complete handoff, transfer is not valid.
- Receiver confirms receipt with a startup plan.

## Key metric
- Downtime between blocks <15 min (target).
