# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │          Workflow Orchestrator           │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────┐   ┌──────────────┐   ┌──────────┐
    │ Phase 1  │──>│ CHECKPOINT 1 │──>│ Phase 2  │
    │  Agents  │   │  (snapshot)  │   │  Agents  │
    └──────────┘   └──────┬───────┘   └────┬─────┘
                          │                ▼
                          │         ┌──────────────┐   ┌──────────┐
                          │         │ CHECKPOINT 2 │──>│ Phase 3  │
                          │         │  (snapshot)  │   │  Agents  │
                          │         └──────┬───────┘   └──────────┘
                          │                │
                  resume  │                │ resume
                  from C1 │                │ from C2
                          ▼                ▼
                   ┌─────────────────────────────┐
                   │     Snapshot Store           │
                   │ (immutable, named, versioned)│
                   └─────────────────────────────┘


## Workflow
Checkpoint / Snapshot

## Objective
Save immutable snapshots of workflow state at defined points so long-running workflows can pause and resume, branch into parallel variants, or roll back to a known-good point without restarting from scratch.

## Roles
- **Workflow Orchestrator:** manages phase transitions, triggers snapshot creation, and handles restore requests.
- **Phase Agents:** execute work within each phase and signal completion to the Orchestrator.
- **Snapshot Agent:** serializes and stores the full workflow state (context, partial outputs, decisions) at each checkpoint.
- **Restore Agent:** loads a named snapshot, validates its integrity, and hands control back to the Orchestrator.
- **Snapshot Store:** immutable, versioned store of all snapshots (append-only).

## When to use
- Long-running workflows (hours/days) that may be interrupted.
- High-cost workflows where restarting from scratch on failure is unacceptable.
- Experimental workflows where you want to branch at a decision point and explore multiple paths.
- Regulatory workflows requiring point-in-time audit snapshots.
- Workflows with human-in-the-loop gates where work must pause until approval.

## Protocol
1. Orchestrator defines checkpoint locations and snapshot naming scheme before starting.
2. Phases execute; when a phase completes, Orchestrator triggers Snapshot Agent.
3. Snapshot Agent captures:
   - All agent outputs produced so far.
   - Workflow metadata (phase, step, config, timestamps).
   - Pending decisions and their context.
4. Snapshot is stored with a unique ID, name, and timestamp. Orchestrator logs checkpoint event.
5. Orchestrator continues to next phase.
6. On resume (after interruption or explicit rollback):
   a. Restore Agent loads the target snapshot.
   b. Validates snapshot integrity (checksum).
   c. Orchestrator restores state and resumes from the checkpoint's next step.
7. For branching: Restore Agent loads a checkpoint; Orchestrator starts a new workflow branch from that point with a different parameter set.

## Snapshot contents
- `snapshot_id`: unique, immutable identifier.
- `workflow_id` + `checkpoint_name`.
- `phase_outputs`: all agent outputs produced before this checkpoint.
- `pending_context`: everything needed to continue from here.
- `config_hash`: ensures restored workflow uses same configuration.
- `created_at`: timestamp.
- `checksum`: integrity verification.

## Rules
- Snapshots are immutable: never overwrite, only append new snapshots.
- A snapshot must be verified (checksum check) before any restore.
- Orchestrator must log every checkpoint creation and restore event.
- Branch workflows from snapshots must get a new `workflow_id` to avoid ID collisions.
- Define checkpoint locations before starting — no retroactive snapshots.
- Snapshot Store must retain snapshots for the defined retention period before purging.

## Deliverables
- Completed workflow output (from last phase or branch).
- Checkpoint manifest: all snapshots created, their IDs, phases, and timestamps.
- Restore log: any checkpoints used for resume or branching.
- Storage usage report per snapshot.
