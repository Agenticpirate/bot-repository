> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Team watchdog

> Self-healing logic for stalled teammates (staleness detection, respawn behavior, and rate limits).

The team watchdog is a safety feature that detects stalled teammate agents and restarts them.

It is designed to be conservative, configurable, and to prevent runaway loops that could balloon LLM costs.

## What it monitors

The watchdog monitors teammate activity (for example: work starting, tool calls, model calls, and errors) and looks for signs that a teammate has stopped making progress.

## When it runs

The watchdog runs periodically in the background.

## Staleness detection

Staleness detection uses conservative time thresholds and includes guardrails to avoid restarting brand-new teammates or thrashing during transient failures.

## What respawn does

When a teammate is restarted, the gateway attempts to preserve continuity so another teammate can safely continue based on local state and outputs.

## Rate limiting (prevents runaway respawn loops)

In addition to a cooldown, the watchdog enforces a cap on restarts within a time window. If a teammate hits the cap, the watchdog pauses automatic restarts to avoid runaway loops and force human intervention.

## Configuration

These settings live under `gateway.team_watchdog`:

* `enabled`: enable/disable the watchdog.
* staleness thresholds: how long a teammate can be inactive before being considered stalled.
* respawn limits: cooldowns and caps to prevent thrash.

## Recommended tuning

For most setups:

* Keep `tool_stale_after_seconds` higher than `stale_after_seconds` (tools can legitimately take longer).
* Keep a non-zero `startup_grace_seconds` (spawns can be slow).
* Keep `max_respawns_per_window` low enough to prevent cost runaway, but high enough to recover from transient failures.
