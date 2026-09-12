# axiom

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: observability
- Homepage: https://github.com/axiomhq/skills
- Keywords: axiom
- Domains: axiom.co, app.axiom.co

## Description

Official Axiom observability integration (MCP Server + Skills). Query logs and metrics with APL, run hypothesis-driven SRE investigations, build dashboards, manage monitors and alerts, translate Splunk SPL queries, and analyze and optimize costs.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/axiomhq/skills.git",
  "sha": "0e98ebaeec76a70c8fda9a7737605800c2f1245d"
}
```

## Components (plugin-index.json)

### mcpServers

- **axiom**: http

### skills

- **axiom-alerting**: Create and manage Axiom monitors and notifiers via the v2 public API. Use when building alerting, routing notifications…
- **axiom-sre**: Expert SRE investigator for incidents and debugging. Uses hypothesis-driven methodology and systematic triage. Can quer…
- **building-dashboards**: Designs and builds Axiom dashboards via API. Covers chart types, APL and metrics/MPL query patterns, SmartFilters, layo…
- **controlling-costs**: Analyzes Axiom query patterns to find unused data, then builds dashboards and monitors for cost optimization. Use when…
- **query-metrics**: Runs metrics queries against Axiom MetricsDB via scripts. Discovers available metrics, tags, and tag values. Use when a…
- **spl-to-apl**: Translates Splunk SPL queries to Axiom APL. Provides command mappings, function equivalents, and syntax transformations…
- **writing-evals**: Scaffolds evaluation suites for the Axiom AI SDK. Generates eval files, scorers, flag schemas, and config from natural-…
