> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Teams, tasks, and handoffs

> Durable multi-agent workflows that can resume after failures.

Teams let multiple agents collaborate on a set of tasks in a way that is designed to be durable and resumable.

## What to expect

* Work can continue even if an agent crashes or is restarted.
* Task state and outputs are stored locally so a teammate can safely take over.
* Guardrails help prevent duplicate work and runaway spend.

## Reliability and recovery

If you are running long-lived team workflows, keep the watchdog enabled so stalled teammates can be recovered automatically. See [Team watchdog](/core/team-watchdog).
