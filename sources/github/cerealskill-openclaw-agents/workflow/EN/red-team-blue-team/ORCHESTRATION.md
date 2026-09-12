# ORCHESTRATION.md

## Diagram

    ┌──────────┐                    ┌──────────┐
    │   Blue   │─── delivers v1 ──>│   Red    │
    │   Team   │                    │   Team   │
    └────┬─────┘                    └────┬─────┘
         │                               │
         │                               v
         │                         ┌───────────┐
         │                         │  Attack / │
         │                         │  Test     │
         │                         └─────┬─────┘
         │                               │
         v                               v
    ┌──────────┐   findings   ┌───────────────┐
    │  Blue    │<─────────────│  Red Report   │
    │  Fixes   │              │ (sev + evid.) │
    └────┬─────┘              └───────────────┘
         │
         v
    ┌──────────┐
    │ Re-test  │
    │ + close  │
    └──────────┘

## Workflow
Red-team / Blue-team

## Objective
Strengthen quality/security with one team attacking assumptions (Red) and another defending/correcting (Blue).

## Roles
- **Blue Team:** designs and implements initial solution.
- **Red Team:** looks for failures, abuse, bypass, and edge cases.
- **Moderator:** decides severity and priority of fixes.

## Protocol
1. Blue delivers v1 + assumptions.
2. Red executes battery of attacks/adversarial tests.
3. Red reports findings (severity + evidence).
4. Blue corrects and documents mitigations.
5. Red retests for closure.

## Severity criteria
- **Critical:** high risk of outage or compromise.
- **High:** significant functional impact.
- **Medium/Low:** improvements or incremental hardening.

## Closure
- List of closed findings
- Explicitly accepted risks
