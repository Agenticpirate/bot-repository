# ROSTER.md

## Team
Customer Success Team

## Objective
Maximize customer retention and lifetime value by guiding customers to success from day 1, monitoring health signals, and intervening proactively before churning happens.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `onboarding-guide` | Onboarding Specialist | Runs structured onboarding journeys to get customers to first value quickly |
| `customer-success-manager` | CSM | Manages ongoing relationships, QBRs, and upsell opportunities |
| `nps-followup` | NPS Analyst | Processes NPS responses, closes the feedback loop, and escalates detractors |
| `churn-predictor` | Churn Predictor | Monitors usage signals and scores accounts by churn risk |

## Interaction Model

Onboarding activates → CSM nurtures → Churn Predictor flags risk → NPS closes feedback loop.

```
┌────────────────────┐      ┌────────────────────────────┐
│  Onboarding Guide  │─────>│   Customer Success Manager │
│ (onboarding-guide) │      │ (customer-success-manager) │
│  (days 1-30)       │      │  (ongoing relationship)    │
└────────────────────┘      └──────────────┬─────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    v                                             v
          ┌──────────────────────┐                   ┌──────────────────┐
          │   Churn Predictor   │                   │   NPS Followup   │
          │  (churn-predictor)  │                   │  (nps-followup)  │
          │  (risk scoring)     │                   │  (feedback loop) │
          └──────────────────────┘                   └──────────────────┘
```

## When to use
- You have a SaaS product and want to reduce churn systematically.
- Customer onboarding is inconsistent and time-to-value is too long.
- You send NPS surveys but don't have capacity to follow up on every response.

## Use Cases
- **New customer activation:** Onboarding runs checklist journey → CSM schedules 30-day check-in.
- **At-risk account:** Churn Predictor flags low usage → CSM does proactive outreach with success plan.
- **Detractor NPS:** NPS Followup logs score → escalates to CSM → CSM schedules recovery call.

## Rules
- Every new customer has an assigned onboarding checklist with a completion deadline.
- Accounts below health score threshold are escalated to CSM within 24h.
- All NPS detractors (0-6) receive a follow-up within 48h.
- CSM owns the account relationship — all team touchpoints are logged in CRM.
