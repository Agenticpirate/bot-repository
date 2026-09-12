# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │          Workflow Orchestrator           │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │          Agent (autonomous work)         │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌─────────────┐
                  │  Checkpoint │
                  │  reached?   │
                  └──────┬──────┘
                    no   │  yes
        ┌────────────────┴──────────────────┐
        ▼                                   ▼
    ┌──────────┐              ┌─────────────────────────┐
    │ Continue │              │   Human Review Gate     │
    │ autonomy │              │   (approve/reject/edit) │
    └──────────┘              └────────────┬────────────┘
                                 approved  │  rejected
                           ┌──────────────┴──────────────┐
                           ▼                              ▼
                   ┌──────────────┐             ┌──────────────────┐
                   │  Continue    │             │  Agent reworks   │
                   │  workflow    │             │  with feedback   │
                   └──────────────┘             └──────────────────┘


## Workflow
Human-in-the-Loop

## Objective
Embed mandatory human review gates at critical points in an otherwise autonomous workflow. Agents handle all routine work; humans are invoked only when decisions exceed defined risk thresholds, ensuring speed without sacrificing control.

## Roles
- **Workflow Orchestrator:** manages the overall flow and knows which checkpoints require human approval.
- **Executing Agents:** carry out autonomous work between checkpoints.
- **Human Reviewer:** receives formatted review requests, approves/rejects/edits, and provides feedback.
- **Gate Agent:** packages checkpoint outputs into a clear review brief and waits for human decision.

## When to use
- Any AI workflow where decisions have irreversible real-world consequences (publishing, payments, deployments).
- Regulated industries requiring human sign-off on AI-generated outputs.
- New workflows in their first N runs before trust is established.
- When the agent's confidence falls below a defined threshold.
- Gradual automation rollout: start with many gates, remove them as reliability is proven.

## Checkpoint triggers
A human gate is required when any of the following are true:
- Action is irreversible (delete, publish, pay, deploy to production).
- Estimated impact exceeds defined threshold (e.g. cost > $500, users affected > 1000).
- Agent confidence score < configured minimum.
- Action touches a sensitive category (PII, legal, compliance, security).
- First time this action type has been performed.

## Protocol
1. Orchestrator and agents execute work autonomously until a checkpoint trigger is met.
2. Gate Agent packages a review brief: what was done, what is proposed, impact analysis, confidence, and a clear approve/reject/edit choice.
3. Review brief is delivered to Human Reviewer via configured channel (Slack, email, UI).
4. Human Reviewer responds within timeout:
   - **Approved:** Orchestrator continues.
   - **Rejected with feedback:** Agent reworks and returns to the same gate.
   - **Edited:** Human's edit is accepted as-is; Orchestrator continues with that version.
5. If timeout expires: escalate; workflow halts until response.
6. All gate decisions are logged with human identity, timestamp, and rationale.

## Rules
- Gates must be configured before the workflow starts — no ad-hoc gates.
- Human must receive enough context to make an informed decision in under 2 minutes.
- Agents must never retry a rejected action without incorporating human feedback.
- Approval from the wrong role level is not valid (match reviewer to risk level).
- Gate logs are immutable audit records.

## Deliverables
- Completed workflow output (post all approvals).
- Gate decision audit log: reviewer, decision, timestamp, feedback, retries.
- Automation coverage report: % of steps handled autonomously vs. gated.
- Recommended gates to relax after N successful runs.
