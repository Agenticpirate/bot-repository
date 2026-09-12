# ROSTER.md

## Team
Legal & Compliance Team

## Objective
Protect the business from legal and regulatory risk by reviewing contracts before they're signed, auditing ongoing compliance, maintaining privacy posture, and keeping a live risk register.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `contract-reviewer` | Contract Reviewer | Reviews, redlines, and flags risky clauses in contracts before execution |
| `gdpr-auditor` | GDPR Auditor | Audits data processing, consent flows, and retention policies for regulatory compliance |
| `privacy-officer` | Privacy Officer | Owns privacy policies, DPAs, and processes data subject access/deletion requests |
| `risk-assessor` | Risk Assessor | Maintains the risk register and scores new operational or legal risks |

## Interaction Model

Risk Assessor evaluates → Contract Reviewer gates signings → Privacy Officer maintains policies → GDPR Auditor continuously audits.

```
┌─────────────────┐      ┌──────────────────────┐
│  Risk Assessor  │─────>│  Contract Reviewer   │
│ (risk-assessor) │      │ (contract-reviewer)  │
│ (risk scoring)  │      │ (pre-signing review) │
└─────────────────┘      └──────────────────────┘
        │                           │
        │ ongoing                   │ policies needed
        v                           v
┌──────────────────┐      ┌──────────────────┐
│  GDPR Auditor    │<────>│ Privacy Officer  │
│  (gdpr-auditor)  │      │(privacy-officer) │
│  (audit cycle)   │      │ (policy owner)   │
└──────────────────┘      └──────────────────┘
```

## When to use
- You're signing contracts with vendors, partners, or customers that need legal review.
- You need to demonstrate GDPR/CCPA compliance to customers or regulators.
- A new product feature involves data processing that requires a privacy assessment.

## Use Cases
- **Vendor contract:** Risk Assessor flags high-risk clauses → Contract Reviewer redlines → Privacy Officer checks DPA → approved/rejected.
- **New feature launch:** Privacy Officer runs privacy impact assessment → GDPR Auditor validates consent flows → Risk Assessor scores residual risk.
- **Data breach:** Privacy Officer triggers breach protocol → GDPR Auditor documents facts → Risk Assessor updates register.

## Rules
- No contract is signed without Contract Reviewer sign-off.
- All new data processing activities require a Privacy Officer assessment.
- GDPR audit runs quarterly at minimum.
- Risk register is updated within 5 business days of any significant change.
