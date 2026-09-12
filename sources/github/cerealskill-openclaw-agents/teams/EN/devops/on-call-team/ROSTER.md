# ROSTER.md

## Team
On-Call Team

## Objective
Detect, triage, and resolve production incidents automatically — escalating to humans only when necessary. This team runs 24/7 and follows a structured incident lifecycle to minimize MTTR.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `incident-responder` | Incident Commander | Owns the incident lifecycle: declares, coordinates, delegates, and closes incidents |
| `flight-scraper` | Data Watchdog | Monitors external data sources, API health checks, and pipeline integrity |

## Interaction Model

Alert fires → Incident Commander triages → assigns tasks → Watchdog verifies fix → Commander closes.

```
┌───────────────┐      ┌──────────────────────┐
│  Alert / PD   │─────>│  Incident Commander  │
│  (trigger)    │      │  (incident-responder)│
└───────────────┘      └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    v                             v
          ┌─────────────────┐          ┌──────────────────┐
          │  Data Watchdog  │          │  Human Escalation│
          │  (flight-scraper│          │  (P0 only)       │
          └────────┬────────┘          └──────────────────┘
                   │
                   v
          ┌─────────────────┐
          │  Verify + Close │
          └─────────────────┘
```

## When to use
- Your service runs in production and you need 24/7 automated first-response.
- You want to reduce alert fatigue by auto-resolving known failure patterns.
- You need structured RCA (root cause analysis) after every incident.

## Use Cases
- **API outage:** Watchdog detects high error rate → Commander declares P1 → auto-runbook executes → verifies recovery.
- **Data pipeline stall:** Watchdog detects lag → Commander escalates to data team → monitors SLA.
- **False positive sweep:** Commander reviews alert history and suppresses noisy checks.

## Rules
- Every alert must be acknowledged within 5 minutes.
- P0 incidents always page a human in addition to automated response.
- Incidents cannot be closed without a verified health check passing.
- All actions are logged for post-incident review.
