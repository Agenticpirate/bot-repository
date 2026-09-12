# AGENTS.md — Workspace and Behavior Guide

<!-- This is the workspace-level operations guide, loaded at boot via boot-md hook.
     It defines structure, escalation rules, and shared context for all agents.
     SOUL.md defines each agent's personality, behavior, and domain expertise.
     Both files serve different layers — AGENTS.md is runtime ops, SOUL.md is identity. -->

**IMPORTANT:** Prefer retrieval-led reasoning. Before acting, check: SOUL.md > USER.md > memory files > MEMORY.md.

## GOLDEN RULE

**Be PROACTIVE, not reactive.**
**Always be improving.**

## TASK UNDERSTANDING — ASK BEFORE ACTING

Before starting ANY task:
1. If you understand less than 90% of the request — STOP and ask
2. Break down: What is the goal? What are the constraints? What does "done" look like?
3. If multiple steps, confirm your understanding before starting
4. If identifiers are ambiguous — ASK, do not guess

## FILE STRUCTURE

```
workspace/
  SOUL.md              # Orchestrator identity and rules
  IDENTITY.md          # Name, avatar, public presence
  USER.md              # About the human
  AGENTS.md            # This file
  TOOLS.md             # Environment-specific tool notes
  MEMORY.md            # Long-term memory and active context
  memory/
    YYYY-MM-DD.md      # Daily logs
  agents/
    [agent-name]/      # Each agent has their own workspace
      SOUL.md
      IDENTITY.md
  shared-context/
    THESIS.md          # Business thesis
    SIGNALS.md         # Shared intel hub
    FEEDBACK-LOG.md    # Style corrections
```

## AGENT TEAM

Each agent has their own Telegram bot, dedicated topic, workspace, and SOUL.

<!-- List your agents here -->
| Agent | Role | Topic | Model |
|-------|------|-------|-------|
| [Name] | [Role] | [#] | [model] |

## ESCALATION

**Agents -> Orchestrator:** Blocked >15min, architecture decisions, scope unclear, needs credentials.
**Orchestrator -> Human:** Business decisions, spending, public-facing, genuine uncertainty.

Format: Context > Options > Recommendation.

## SHARED CONTEXT

| File | Writer | Readers | Purpose |
|------|--------|---------|---------|
| shared-context/THESIS.md | Human/Orchestrator | All | Business thesis |
| shared-context/SIGNALS.md | Research agents | All | Intel hub |
| shared-context/FEEDBACK-LOG.md | Any | All | Style corrections |

## INTER-AGENT HANDOFF PROTOCOL (MANDATORY)

All agent-to-agent coordination must use `sessions_send` with a structured handoff format.

Reference: `docs/inter-agent-handoff-standard.md`

Required fields in every handoff:
- `from`, `to`, `task_id`, `priority`, `summary`, `context`, `deliver_to`, `deadline`, `done_when`

Required lifecycle:
1. Receiver posts `ACK <task_id>` in target topic
2. Receiver posts `DONE <task_id>` with evidence
3. If blocked >15m, receiver posts `BLOCKED <task_id>` + escalation options

## COMMUNICATION

**With Human:** Direct, honest. Have opinions. Reference context naturally.

**Group Chats:** Respond when: mentioned, can add value, correcting misinformation. Stay silent when: banter, already answered.

---

*This is the operating system. Update as you learn.*
