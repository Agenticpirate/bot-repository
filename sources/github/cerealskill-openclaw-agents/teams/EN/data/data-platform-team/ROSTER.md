# ROSTER.md

## Team
Data Platform Team

## Objective
Deliver reliable, queryable, and visualized data to the business — from raw source ingestion to polished dashboards — using a stage-gated data pipeline.

## Members

| Agent | Role | Responsibility |
|-------|------|----------------|
| `data-engineer` | Data Engineer | Designs data architecture, manages warehouses, and ensures pipeline reliability |
| `etl-pipeline` | ETL Specialist | Builds extract-transform-load flows between source systems and the warehouse |
| `sql-assistant` | SQL Analyst | Writes, reviews, and optimizes analytical queries and data models |
| `dashboard-builder` | BI Developer | Builds dashboards, reports, and self-serve analytics for stakeholders |

## Interaction Model

Engineer designs → ETL ingests → SQL models → Dashboard visualizes.

```
┌──────────────────┐      ┌──────────────────┐
│  Data Engineer   │─────>│  ETL Pipeline    │
│ (data-engineer)  │      │  (etl-pipeline)  │
│  (architecture)  │      │  (ingestion)     │
└──────────────────┘      └────────┬─────────┘
                                   │ raw data
                                   v
                          ┌──────────────────┐
                          │  SQL Assistant   │
                          │ (sql-assistant)  │
                          │  (modeling)      │
                          └────────┬─────────┘
                                   │ clean models
                                   v
                          ┌──────────────────────┐
                          │  Dashboard Builder   │
                          │ (dashboard-builder)  │
                          │  (visualization)     │
                          └──────────────────────┘
```

## When to use
- You're building a new analytics stack or migrating from spreadsheets.
- Stakeholders need self-serve dashboards with reliable, fresh data.
- Existing data pipelines are brittle and need architectural review.

## Use Cases
- **New data source:** Engineer evaluates schema → ETL builds connector → SQL models the data → Dashboard adds charts.
- **Dashboard refresh:** SQL rewrites stale queries → Dashboard publishes updated views.
- **Pipeline failure:** Engineer diagnoses → ETL reruns failed jobs → SQL validates data integrity.

## Rules
- No raw data goes directly into dashboards — always goes through a SQL model layer.
- All ETL jobs have idempotency and retry logic.
- Schema changes require Data Engineer review before ETL runs.
- Dashboards include data freshness timestamps.
