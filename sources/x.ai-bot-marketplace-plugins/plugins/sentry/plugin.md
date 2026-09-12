# sentry

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: monitoring
- Homepage: https://github.com/getsentry/sentry-for-ai
- Keywords: sentry
- Domains: sentry.io

## Description

Sentry error monitoring integration. Access error reports, analyze stack traces, search issues by fingerprint, and debug production errors directly from your development environment.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/getsentry/plugin-grok.git",
  "sha": "91e0cb6c79730e02bcf8f7dbcb1795e677fe8cc5"
}
```

## Components (plugin-index.json)

### mcpServers

- **sentry**: http

### skills

- **sentry-create-alert**: Create Sentry alerts using the workflow engine API. Use when asked to create alerts, set up notifications, configure is…
- **sentry-debug-issue**: Debug and fix a Sentry issue — find it (by link, ID, or search), pull full context (stack trace, breadcrumbs, trace, lo…
- **sentry-fix-stack-traces**: Make Sentry stack traces readable — upload source maps for JavaScript/TypeScript, or debug files for native and mobile…
- **sentry-get-started**: Guided entry point for using Sentry through your agent. Orients you to your current setup and, for a new project, sets…
- **sentry-instrument**: Instrument an application with Sentry — detect the platform, install and initialize the SDK if needed, and wire up any…
- **sentry-otel-exporter-setup**: Configure the OpenTelemetry Collector with Sentry Exporter for multi-project routing and automatic project creation. Us…
- **sentry-setup-releases**: Set up Sentry releases and deploy tracking — tag events with a version and environment, create the release in CI with i…
- **sentry-snapshots-cocoa**: Full Sentry Snapshots setup for Apple/Cocoa projects. Use when asked to "setup SnapshotPreviews", "setup Apple snapshot…
