# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │              Supervisor                  │
    │   (heartbeat monitor + progress check)  │
    └────┬─────────────┬─────────────┬─────────┘
         │             │             │
         v             v             v
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │Worker 1 │  │Worker 2 │  │Worker N │
    │  [ok]   │  │  [ok]   │  │ [fail]  │──┐
    └─────────┘  └─────────┘  └─────────┘  │
                                           v
                                    ┌────────────┐
                                    │  Recovery  │
                                    │   Agent    │
                                    │(resume/redo│
                                    └────────────┘

## Workflow
Watchdog / Supervisor (monitor and recover)

## Objective
Continuously monitor agent health and task progress, intervening automatically when failures or stalls are detected.

## Roles
- **Supervisor:** monitors heartbeats, progress, and output quality.
- **Worker agents:** execute assigned tasks and report status.
- **Recovery agent:** takes over or restarts failed work.

## When to use
- Long-running or unattended agent workflows.
- Critical tasks that cannot silently fail.
- Environments where agents may hang or produce degraded output.

## Protocol
1. Workers register with supervisor and begin tasks.
2. Workers send periodic heartbeats with progress updates.
3. Supervisor checks heartbeat intervals and progress thresholds.
4. On missed heartbeat or stalled progress:
   - Alert and wait one grace period.
   - If still unresponsive, trigger recovery agent.
5. Recovery agent resumes from last checkpoint or restarts task.
6. Supervisor logs all interventions.

## Health checks
- **Heartbeat:** expected every N seconds.
- **Progress:** must advance past checkpoint within timeout.
- **Output quality:** spot-check outputs against baseline.

## Rules
- Supervisor never executes work directly — only monitors and delegates.
- Recovery must be idempotent (safe to retry).
- All interventions logged with timestamp and reason.

## Deliverables
- Health log per worker
- Intervention history
- Uptime and recovery metrics
