# ORCHESTRATION.md

## Diagram

    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Step 1  │──>│  Step 2  │──>│  Step 3  │──>│  Step N  │
    │  Agent   │   │  Agent   │   │  Agent   │   │  Agent   │
    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │ fail         │ fail         │ fail         │
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Comp-1    │<──│Comp-2    │<──│Comp-3    │
    │(undo S1) │   │(undo S2) │   │(undo S3) │
    └──────────┘   └──────────┘   └──────────┘
          │
          ▼
    ┌──────────────────────────────────┐
    │  Saga Log (event audit trail)    │
    └──────────────────────────────────┘


## Workflow
Saga (Compensating Transactions)

## Objective
Execute a multi-step workflow that modifies distributed state, ensuring consistency by defining a compensation action for every step. If any step fails, all prior steps are undone in reverse order, leaving the system in its original state.

## Roles
- **Step Agents:** each executes one logical step and emits a success/failure event.
- **Compensation Agents:** one per step; each knows exactly how to undo that step's changes.
- **Saga Orchestrator:** owns the execution state machine, triggers steps and compensations, writes the event log.
- **Saga Log:** append-only audit trail of every event (step executed, step failed, compensation executed, saga completed/aborted).

## When to use
- Workflows that write to multiple external systems and must stay consistent.
- Long-running operations where distributed transactions are impractical.
- Any multi-step process where partial completion is worse than full failure.
- Order processing, payment flows, multi-service provisioning, data migrations.

## Protocol
1. Orchestrator initializes saga with a unique saga ID and logs start.
2. Execute Step 1 Agent. On success: log and proceed to step 2.
3. On any step failure:
   a. Log the failure with step ID, error, and timestamp.
   b. Trigger Compensation Agent for the failed step (if step partially succeeded).
   c. Work backwards: trigger Compensation Agent for each previously completed step.
   d. Log each compensation result.
4. If all compensations succeed → log saga aborted cleanly; surface clear error to caller.
5. If a compensation fails → log compensation failure; escalate to human immediately.
6. If all steps complete successfully → log saga committed.

## Compensation rules
- Compensation actions must be idempotent: safe to retry if they fail once.
- Each compensation must be registered before its step executes — no retroactive compensations.
- Compensation order is strictly reverse: step N undone before step N-1.
- Compensations must never call downstream steps — only undo their own step's changes.

## Rules
- Every step must have a registered compensation before the saga starts.
- Saga IDs must be globally unique and included in every log event.
- No step may proceed if the previous step's log event is missing.
- Timeouts count as failures and trigger compensation.
- Retry a failed compensation once before escalating to human.

## Deliverables
- Saga result: `committed` | `aborted` | `escalated`.
- Full event log with saga ID, timestamps, and per-step status.
- Compensation log for all aborted sagas.
- Alert to responsible owner if any saga lands in `escalated` state.
