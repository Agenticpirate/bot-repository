# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │            Task Assigned                 │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │           Executor Agent                 │
    │         (attempt task)                   │
    └────────────────────┬─────────────────────┘
                         ▼
                    ┌─────────┐
                    │ Success?│
                    └────┬────┘
                   yes   │   no
              ┌──────────┴──────────┐
              ▼                     ▼
    ┌──────────────┐     ┌───────────────────┐
    │   Deliver    │     │  Retry budget     │
    │   Result     │     │  exhausted?       │
    └──────────────┘     └────────┬──────────┘
                            no   │   yes
                      ┌──────────┴──────────┐
                      ▼                     ▼
              ┌──────────────┐    ┌──────────────────┐
              │ Backoff +    │    │  Rollback Agent   │
              │ Retry        │    │  (compensate +    │
              └──────┬───────┘    │   restore state)  │
                     │            └────────┬──────────┘
                     ▼                     ▼
              ┌──────────────┐    ┌──────────────────┐
              │  Executor    │    │  Escalate to     │
              │  (re-attempt)│    │  Human           │
              └──────────────┘    └──────────────────┘


## Workflow
Retry & Rollback (resilient task execution)

## Objective
Ensure tasks complete reliably by retrying on transient failures, rolling back partial changes on permanent failures, and escalating when recovery is impossible.

## Roles
- **Executor:** attempts the task and reports success/failure with context.
- **Retry Controller:** decides whether to retry (transient) or abort (permanent), manages backoff.
- **Rollback Agent:** reverses partial changes using compensation actions.
- **Escalation Target:** human or supervisor notified when all recovery is exhausted.

## When to use
- Tasks that modify state (deployments, data migrations, API calls).
- Environments with transient failures (network, rate limits, timeouts).
- Any workflow where partial completion is worse than no completion.

## Protocol
1. Executor attempts the task and checkpoints state before mutations.
2. On failure, classify error:
   - **Transient** (timeout, 429, 503): retry with exponential backoff.
   - **Permanent** (4xx, validation, logic error): skip to rollback.
3. Retry up to N attempts (configurable budget).
4. If retries exhausted → trigger Rollback Agent.
5. Rollback Agent executes compensation actions in reverse order.
6. If rollback succeeds → report clean failure with context.
7. If rollback fails → escalate to human immediately.

## Retry policy
- **Max retries:** 3 (configurable per task)
- **Backoff:** exponential (1s, 2s, 4s) with jitter
- **Timeout per attempt:** 30s default
- **Circuit breaker:** after 3 consecutive failures, pause all retries for cooldown

## Rollback rules
- Compensation actions must be idempotent.
- Execute in reverse chronological order.
- Each rollback step is itself retried once on failure.
- Full rollback log with timestamps.

## Rules
- Never retry permanent errors.
- Always checkpoint before mutation.
- Rollback must leave system in a known-good state.
- All attempts and outcomes logged for audit.

## Deliverables
- Execution attempt log (attempt #, error, classification)
- Rollback action log (if triggered)
- Final status: success | rolled-back | escalated
- Metrics: attempts used, total elapsed time
