# ROSTER.md

## Team
Product Team

## Objective
Deliver a clear, prioritized roadmap each sprint — from incoming feature requests to shipped release notes — running tight agile ceremonies and keeping every stakeholder aligned.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `product-owner` | Product Owner | Owns the product vision and roadmap; writes user stories; accepts sprint work |
| `product-scrum` | Scrum Master | Facilitates sprint planning, standups, retros; tracks velocity and blockers |
| `feature-request` | Feature Manager | Triages, de-duplicates, and scores incoming feature requests from users |
| `release-notes` | Release Manager | Drafts and publishes changelogs and release notes for every shipped version |

## Interaction Model

Feature Manager triages → PO prioritizes → Scrum runs sprint → Release Manager publishes.

```
┌──────────────────────┐      ┌─────────────────────┐
│   Feature Manager   │─────>│   Product Owner     │
│  (feature-request)  │      │  (product-owner)    │
│  (triage + score)   │      │  (prioritize)       │
└──────────────────────┘      └──────────┬──────────┘
                                         │ sprint backlog
                                         v
                              ┌─────────────────────┐
                              │   Product Scrum     │
                              │  (product-scrum)    │
                              │  (run the sprint)   │
                              └──────────┬──────────┘
                                         │ shipped
                                         v
                              ┌─────────────────────┐
                              │   Release Notes     │
                              │  (release-notes)    │
                              │  (communicate)      │
                              └─────────────────────┘
```

## When to use
- You're running an agile product cycle and want consistent sprint rituals.
- Feature request inbox is chaotic and unscored.
- Releases ship without clear communication to users or stakeholders.

## Use Cases
- **Sprint kick-off:** Feature Manager scores requests → PO sets sprint goal → Scrum schedules ceremonies.
- **Mid-sprint blocker:** Scrum flags dependency → PO deprioritizes blocked item → team adjusts.
- **Release day:** Scrum confirms shipped items → Release Manager publishes changelog → PO notifies stakeholders.

## Rules
- No story enters a sprint without acceptance criteria written by the PO.
- Feature requests are scored on impact × effort before any backlog grooming.
- Release notes ship within 2h of a production deploy.
- Retro action items are tracked and reviewed next sprint.
