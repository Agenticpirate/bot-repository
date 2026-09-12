# ROSTER.md

## Team
Full-Stack Dev Team

## Objective
Deliver production-ready software features from requirements to deployment using a stage-gated pipeline. Each stage is owned by a specific team member and must pass before moving forward.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `backend-engineer` | Lead Engineer | Writes, reviews, and refactors code; owns technical architecture decisions |
| `product-owner` | Product Owner | Writes specs and acceptance criteria; grooms backlog; signs off on deliverables |
| `platform-engineer` | Release Engineer | Manages CI/CD, infra provisioning, canary deployments, and rollbacks |

## Interaction Model

PO defines → Dev implements → SRE releases → PO accepts.

```
┌─────────────────┐      ┌──────────────────────┐
│  Product Owner  │─────>│  Backend Engineer    │
│ (product-owner) │      │ (backend-engineer)   │
└─────────────────┘      └──────────┬───────────┘
                                     │ PR merged
                                     v
                          ┌──────────────────────┐
                          │  Platform Engineer   │
                          │ (platform-engineer)  │
                          └──────────┬───────────┘
                                     │ deployed
                                     v
                          ┌──────────────────────┐
                          │  Product Owner       │
                          │  (acceptance)        │
                          └──────────────────────┘
```

## When to use
- Building a new feature from scratch with clear ownership stages.
- Running a sprint where requirements, development, and ops are separate concerns.
- You need traceability from spec to production deploy.

## Use Cases
- **Feature sprint:** PO writes stories → Dev implements → SRE deploys to staging → PO accepts → SRE promotes to prod.
- **Bug fix:** Dev diagnoses and fixes → SRE deploys hotfix → PO confirms resolution.
- **Infra change:** SRE proposes → Dev reviews impact → SRE executes with PO sign-off.

## Rules
- No code ships without a passing CI run.
- PO acceptance is required before any production promotion.
- SRE is on-call for 24h after every deploy.
- Dev owns code review—no auto-merges without review.
