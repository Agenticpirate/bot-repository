# ROSTER.md

## Team
Security Operations Team

## Objective
Continuously detect, investigate, and respond to security threats and vulnerabilities — keeping systems hardened and incidents contained before they escalate.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `threat-monitor` | Threat Analyst | Continuously monitors logs, alerts, and traffic for indicators of compromise |
| `vuln-scanner` | Vulnerability Scanner | Runs automated scans and triages CVEs by exploitability and impact |
| `incident-responder` | Incident Commander | Coordinates security incident response, containment, and recovery |
| `incident-logger` | Evidence Logger | Documents all findings, timelines, and decisions for audit and post-mortems |

## Interaction Model

Monitor detects → Scanner assesses scope → Commander coordinates response → Logger captures everything.

```
┌──────────────────┐      ┌──────────────────┐
│  Threat Monitor  │─────>│  Vuln Scanner    │
│ (threat-monitor) │      │ (vuln-scanner)   │
└──────────────────┘      └────────┬─────────┘
                                   │ scope confirmed
                                   v
                          ┌──────────────────────┐
                          │  Incident Responder  │
                          │ (incident-responder) │
                          └──────────┬───────────┘
                                     │ ongoing
                                     v
                          ┌──────────────────┐
                          │ Incident Logger  │
                          │(incident-logger) │
                          └──────────────────┘
```

## When to use
- You need SOC (Security Operations Center) coverage without a full human team.
- A CVE or threat alert requires coordinated investigation and response.
- You're running regular vulnerability assessments and need structured reporting.

## Use Cases
- **Active threat detected:** Monitor fires alert → Scanner confirms affected surface → Responder isolates → Logger documents.
- **CVE triage sprint:** Scanner identifies new CVEs → rates severity → Responder patches in priority order → Logger tracks remediation.
- **Post-incident review:** Logger produces full timeline for compliance or RCA.

## Rules
- Every alert is treated as real until disproved.
- No containment action is taken without logging the reason and timestamp.
- P0 incidents wake a human — no autonomous remediation on production without approval.
- All scan results are retained for 90 days minimum.
