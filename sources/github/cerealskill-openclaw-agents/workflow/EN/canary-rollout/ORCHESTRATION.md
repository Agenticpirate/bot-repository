# ORCHESTRATION.md

## Diagram

    ┌──────────────────────────────────────────┐
    │          Change / Deployment             │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │        Canary Agent                      │
    │   (execute on reduced scope: 5-10%)      │
    └────────────────────┬─────────────────────┘
                         ▼
    ┌──────────────────────────────────────────┐
    │        Observer Agent                    │
    │   (monitor metrics + error rates)        │
    └────────────────────┬─────────────────────┘
                         ▼
                  ┌────────────┐
                  │  Metrics   │
                  │  healthy?  │
                  └─────┬──────┘
              yes       │    no
         ┌──────────────┴──────────────┐
         ▼                             ▼
    ┌──────────────┐         ┌──────────────────┐
    │  Expand to   │         │  Rollback Agent  │
    │  next tier   │         │  (revert canary) │
    │  25%→50%→100%│         └────────┬─────────┘
    └──────┬───────┘                  ▼
           │                 ┌──────────────────┐
           ▼                 │  Incident Report │
    ┌──────────────┐         └──────────────────┘
    │  Full Rollout│
    │  Complete    │
    └──────────────┘


## Workflow
Canary Rollout (progressive deployment)

## Objective
Minimize risk by deploying changes to a small subset first, validating metrics, and progressively expanding — or rolling back — based on observed health.

## Roles
- **Canary Agent:** executes the change on the canary scope (limited blast radius).
- **Observer Agent:** monitors health metrics, error rates, latency, and business KPIs during each tier.
- **Rollback Agent:** reverts the canary if metrics breach thresholds.
- **Promotion Controller:** decides tier progression based on Observer data.

## When to use
- Deployments to production or shared environments.
- Configuration changes with uncertain impact.
- Any change where "test in prod safely" is the strategy.
- Multi-agent task rollouts where you want to validate the approach on a subset.

## Protocol
1. Define canary tiers: 5% → 25% → 50% → 100% (configurable).
2. Canary Agent executes change on tier 1 scope.
3. Observer Agent monitors for observation window (e.g., 10 min per tier).
4. Promotion Controller evaluates:
   - Error rate < threshold → promote to next tier.
   - Error rate ≥ threshold → trigger Rollback Agent.
5. Repeat for each tier until 100% or rollback.
6. On full rollout: Observer continues monitoring for bake period.

## Health thresholds
- **Error rate:** < 1% increase from baseline
- **Latency p99:** < 20% increase from baseline
- **Business KPIs:** no degradation beyond tolerance

## Tier schedule (default)
| Tier | Scope | Observation window |
|------|-------|--------------------|
| 1    | 5%    | 10 min             |
| 2    | 25%   | 15 min             |
| 3    | 50%   | 15 min             |
| 4    | 100%  | 30 min (bake)      |

## Rules
- Never skip tiers (no 5% → 100%).
- Rollback is automatic if thresholds are breached — no manual approval needed.
- Observer must compare against pre-deployment baseline, not absolute values.
- All tier transitions logged with metrics snapshot.

## Deliverables
- Deployment progression log (tier, timestamp, metrics)
- Health dashboard per tier
- Final status: fully-rolled-out | rolled-back-at-tier-N
- Post-deployment bake report
