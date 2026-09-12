#!/usr/bin/env python3
"""Build data/plugins.json from the day-0 snapshot + live marketplace parse.

One-shot / refresh helper. After it writes JSON, run generate_readme.py.
Not imported by CI. Stdlib only.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ROSTER = REPO / "docs" / "catalog-snapshots" / "grok-bot-2026-08-12" / "roster.md"
MARKET = (
    REPO
    / "docs"
    / "catalog-snapshots"
    / "grok-bot-2026-08-12"
    / "cursor-marketplace.md"
)
OUT = REPO / "data" / "plugins.json"
VENDOR_URLS = REPO / "data" / "vendor-urls.json"
TSV = (
    REPO
    / "docs"
    / "catalog-snapshots"
    / "grok-bot-2026-08-12"
    / "url-resolutions.tsv"
)

# Cursor first-party / first-party-hosted listings that the homepage parser
# keyed under a different display name than the Grok Bot roster.
SLUG_OVERRIDES = {
    "CLI for Agents": "/marketplace/cursor/cli-for-agent",
    "Cursor SDK": "/marketplace/cursor/cursor-sdk",
    "pstack": "/marketplace/cursor/pstack",
}

DESC_OVERRIDES = {
    "CLI for Agents": (
        "Patterns for designing CLIs that coding agents can run reliably: "
        "flags, help with examples, pipelines, errors, idempotency, and dry-run."
    ),
    "Cursor SDK": (
        "Build apps, scripts, CI pipelines, and automations on the Cursor "
        "TypeScript SDK, covering runtime selection, auth, streaming, MCP, "
        "and error handling."
    ),
    "pstack": (
        "Agent workflows for writing less, higher-quality code that can be "
        "parallelized with a deep-first review pass."
    ),
    "Sourcegraph": (
        "Code search plus an MCP server and slash commands for navigating "
        "large codebases from the agent."
    ),
    "Snowflake": (
        "A Snowflake skill and MCP server for warehouse questions and "
        "account work from the agent."
    ),
    "Aikido": (
        "Security-scanning skills, a rule, and an MCP server for Aikido "
        "findings inside the agent."
    ),
    "GitHits": "A code-context layer that feeds relevant repository context to coding agents.",
    "Airwallex": "A CLI for Airwallex payments and payouts from the agent.",
    "Atlan": (
        "Enterprise context layer for governed metadata, lineage, glossaries, "
        "and SQL over organization knowledge repos."
    ),
    "Opsera": (
        "DevSecOps agent for architecture analysis, security scanning, "
        "compliance auditing, and SQL security review."
    ),
    "ClickHouse": "Skills, rules, and MCP for ClickHouse best practices from the agent.",
    "Elastic": (
        "Skills and docs for Elasticsearch, Kibana, Observability, Security, "
        "ES|QL, OpenTelemetry, and MCP access."
    ),
    "Mixpanel": "Skills for tracking implementation and metric investigation.",
    "OpenSearch": (
        "Skills for search apps, log analytics, traces, and deploys to "
        "Amazon OpenSearch Service or Serverless."
    ),
    "ThoughtSpot": (
        "Developer documentation search across Visual Embed SDK, REST API v2, "
        "and guides over MCP."
    ),
    "Notion": "Packaged Notion skills plus the Notion MCP server.",
    "Slack": (
        "MCP server for searching channels, sending messages, and other Slack "
        "actions from MCP-compatible clients."
    ),
    "Browserstack": (
        "Test websites and mobile apps on real devices, run automated tests, "
        "debug failures, and manage test cases."
    ),
    "Clerk": (
        "Authentication toolkit with setup guides, an MCP server, and skills "
        "for frameworks, mobile, organizations, billing, and webhooks."
    ),
    "CockroachDB": (
        "Explore schemas, write optimized SQL, debug queries, and manage "
        "distributed database clusters."
    ),
    "JFrog": (
        "Platform integration with MCP, security skills, Agent Package "
        "Resolution, supply-chain practices, and Agent Guard governance."
    ),
    "Netlify": (
        "Platform skills for functions, edge functions, blobs, identity, "
        "image CDN, forms, config, CLI, frameworks, caching, and deploys."
    ),
    "ParadeDB": (
        "Adds Elasticsearch-quality full-text search, vector retrieval, and "
        "aggregations to PostgreSQL, with a docs MCP for agent use."
    ),
    "Pinecone": (
        "Vector database integration to create indexes, upsert data, and run "
        "semantic search via the Pinecone MCP server."
    ),
    "Railway": (
        "Skills and MCP for deploying, configuring, monitoring, and "
        "troubleshooting apps, databases, and networking on Railway."
    ),
    "Redis": (
        "Development best practices for data structures, the query engine, "
        "vector search, caching, and performance."
    ),
    "Sentry": "Debugging plugin with Sentry MCP and skill capabilities.",
    "turbopuffer": "Vector and full-text search database integration.",
    "Twilio": (
        "Skills and MCP for Messaging, Voice, Verify, SendGrid, and 30+ "
        "products, including API order and what to avoid."
    ),
    "WorkOS": (
        "Skills for AuthKit, SSO, Directory Sync, RBAC, Vault, Audit Logs, "
        "and migrations, plus an MCP server for the workspace."
    ),
    "1Password": (
        "Developer-environment tools to create, import, and manage project "
        "secrets over MCP, plus an agent skill for secret workflows."
    ),
    "AMD": (
        "Verified agent skills for routing image and audio through local AI "
        "on Ryzen AI and serving LLMs on AMD Instinct GPUs."
    ),
    "Buildkite": (
        "MCP server and skills for designing pipelines, troubleshooting "
        "builds, and common CI/CD agent workflows."
    ),
    "Corridor": (
        "Secures AI-generated code. Start by creating an API key at "
        "https://app.corridor.dev/settings."
    ),
    "Databricks": (
        "Skills for the CLI, Apps, Lakebase, Model Serving, Lakeflow Jobs, "
        "Spark Declarative Pipelines, and related Databricks surfaces."
    ),
    "Endor Labs Agent Kit": (
        "Setup and security-workflow agents and skills for Endor Labs inside "
        "the coding agent."
    ),
    "eToro": (
        "Rules, skills, and live API documentation for building on the eToro "
        "Public API."
    ),
    "Forge": (
        "Work orders, journey progress, artifacts, ForgeScore, dev activity, "
        "and project context for AI-assisted development."
    ),
    "Mem0": (
        "Persistent memory, personalization, and semantic search via the "
        "Mem0 platform."
    ),
    "Microsoft Dataverse": (
        "CRUD, bulk data operations, advanced queries, and schema lifecycle "
        "for Dataverse from a coding agent."
    ),
    "Modern Web Guidance": (
        "Agent skill and CLI that steers web apps toward modern, secure, "
        "high-performance APIs instead of outdated workarounds."
    ),
    "Port": (
        "MCP server that gives the agent engineering context from the Port "
        "system of record for services, teams, and related entities."
    ),
    "Remotion": (
        "Video-creation skills covering animations, audio, captions, 3D, and "
        "programmatic React video."
    ),
    "Roboflow": (
        "Computer-vision skills and MCP tools for datasets, annotation, "
        "training, workflows, inference, and deployment."
    ),
    "Snyk": "Security scanning, remediation, and dependency health.",
    "Snyk API & Web": (
        "Onboard scan targets, configure authentication, run DAST scans, and "
        "triage findings through the Snyk API and Web MCP server."
    ),
    "Shopify": (
        "Developer tools to search Shopify docs and generate or validate "
        "GraphQL, Liquid, and UI extension code."
    ),
    "Stripe": (
        "Integration help covering best practices, API and SDK upgrade "
        "guidance, and the Stripe MCP server."
    ),
    "Airtable": (
        "Database and operations layer that combines structured data with "
        "shared visual surfaces, plus the official Airtable MCP server."
    ),
    "Atlassian": (
        "MCP and skills for Jira, Confluence, triage, backlogs, status "
        "reports, and related Atlassian work."
    ),
    "Atlassian Teamwork Graph": (
        "Agent-first interface to Jira issues, Confluence pages, Bitbucket "
        "PRs, and connected third-party sources via Atlassian's context graph."
    ),
    "Box": (
        "Search, read, and manage Box content, build platform integrations, "
        "and use Box AI for Q&A, summarization, and extraction."
    ),
    "Harness": (
        "Packaged Harness skills and MCP server to build, debug, deploy, and "
        "govern from the agent."
    ),
    "LaunchDarkly": (
        "Agent skills and MCP server for feature-flag management, AI "
        "configuration, and skill authoring."
    ),
    "Sanity": "MCP server, agent skills, rules, and commands for Sanity content work.",
    "Gong": (
        "Revenue-intelligence MCP for account summaries, deal insights, and "
        "call briefs."
    ),
    "Zoom": (
        "Search meetings and recordings, pull summaries and transcripts, and "
        "work with Zoom Docs."
    ),
}

# Concrete scenarios. Must not restate the description; no your/our.
USE_CASES: dict[str, str] = {
    "Arize": "Exporting traces from a failing eval run, comparing two prompt versions, opening the deep link to the span that blew the score.",
    "Atlan": "Looking up the glossary definition before writing a join, walking lineage from a broken dashboard metric, running a governed SQL check.",
    "AWS Agents": "Scaffolding a Bedrock AgentCore worker, attaching a Gateway tool, reading a trace after a failed multi-agent handoff.",
    "AWS SageMaker": "Choosing a training job type, checking why a hosted endpoint drifted, generating the deploy config for a new model.",
    "Browserbase Browse": "Opening a staging URL, filling a form the API does not expose, capturing the network call that failed checkout.",
    "Composio": "Connecting a SaaS account over managed OAuth, routing a tool call to the right app, running a bulk pull in the remote sandbox.",
    "Context7": "Pulling the current SDK page for a library, grabbing a version-specific example, checking whether a method still exists.",
    "Create Plugin": "Scaffolding a new marketplace plugin, generating the manifest, running the pre-submit quality checks.",
    "DataRobot": "Kicking off a training job, checking a deployment's prediction health, pulling a monitoring alert.",
    "Firetiger": "Asking the ops agent what is on fire, pulling the skill that matches an incident, querying MCP for the latest signal.",
    "Langfuse": "Inspecting a trace for a bad generation, pulling the current prompt version, comparing eval scores across two runs.",
    "Opsera": "Running an architecture scan, checking a SQL query for a security finding, reading a compliance audit result.",
    "Parallel": "Running a deep-research pass on a competitor, extracting structured fields from a set of pages, enriching a lead list.",
    "Runlayer": "Listing what MCP servers are live, blocking a tool that would leak a secret, pulling the audit trail after a run.",
    "shadcn/ui": "Searching a registry for a component, installing it as source, auditing which components a project already uses.",
    "Sourcegraph": "Searching a symbol across repos, opening the MCP result for a call site, running a slash command against the graph.",
    "Superpowers": "Starting a TDD loop on a failing test, using a debugging pattern mid-incident, handing off a collaboration checklist.",
    "Tabnine": "Semantically searching a remote repo, looking up a symbol, asking for a coaching note on a PR.",
    "Tabnine Context Engine": "Onboarding a tenant, walking a service in the knowledge graph, applying a suggested CVE fix.",
    "Docs Canvas": "Opening an architecture note as a canvas, jumping a TOC section, following a cross-reference to a runbook.",
    "PR Review Canvas": "Grouping a noisy diff by importance, hiding generated boilerplate, highlighting the unexpected branch.",
    "Intercom": "Finding a conversation by customer email, looking up the company record, updating a Help Center article.",
    "Plain": "Opening a support thread, attaching it to a tenant, editing the help-center article that should have answered it.",
    "Amplitude": "Instrumenting a new event, reading a chart that dropped, checking an experiment before a flag flip.",
    "Antimetal": "Triaging a production error, walking the suggested root cause, applying the remediation in the same session.",
    "Apify": "Starting a scrape actor, extracting a structured table, checking why a run stopped mid-crawl.",
    "Astronomer": "Exploring a warehouse schema, authoring a pipeline, checking an Airflow DAG that missed its slot.",
    "AWS Data Analytics": "Inventorying Glue tables, writing a federated Athena query, checking an S3 Tables Iceberg load.",
    "Azure Cosmos DB": "Listing databases in an account, running a vector search, discovering a container schema.",
    "Braintrust": "Opening an experiment, reading evaluation logs, comparing two project runs.",
    "Bright Data": "Searching the live web, extracting a structured product page, driving a browser step the site blocks.",
    "ClickHouse": "Writing a query against a merge tree, checking a best-practice rule, connecting the MCP server to a cluster.",
    "Confidence by Spotify": "Reading a feature flag, checking an experiment allocation, running a migration tool against a flag.",
    "Dagster": "Asking how a dg CLI command works, checking a software-defined asset, debugging a failed materialization.",
    "dbt Labs": "Modeling a new mart, writing a semantic-layer metric, troubleshooting a Cloud job that went red.",
    "Elastic": "Looking up an ES|QL example, checking OpenTelemetry docs, pulling the MCP page for a Kibana task.",
    "Exa": "Searching the web for a primary source, extracting the page body, checking a claim against live results.",
    "Firecrawl": "Scraping a docs site, crawling a sitemap, searching a domain the Bot's browser cannot finish.",
    "Grafana Cloud": "Querying a hosted Grafana MCP, checking an alert, reading a dashboard the local CLI does not have.",
    "Grafana Labs": "Working on a Grafana Assistant app, checking a CLI command, applying a rule from the skill pack.",
    "Hex": "Opening a Hex workspace over MCP, asking about a notebook, sharing a result back into the project.",
    "Hugging Face": "Creating a dataset card, kicking off a training run, publishing an eval to the Hub.",
    "Mixpanel": "Checking why a tracking call is missing, investigating a metric dip, implementing a new event.",
    "Observe by Snowflake": "Deploying Observe infra, checking an MCP config, reading an observability skill for a service.",
    "Omni": "Exploring a model, running a query, publishing a dashboard from the embed SDK.",
    "OpenSearch": "Standing up a hybrid search app, querying logs with PPL, deploying to OpenSearch Serverless.",
    "Pendo": "Checking feature adoption, watching a session replay, reading account-health feedback.",
    "PostHog": "Reading a funnel, flipping a feature flag, opening an error-tracking issue.",
    "Postman": "Syncing a collection, generating an OpenAPI spec, running a Flow against a staging API.",
    "Prisma": "Updating a schema, applying a Prisma rule, running the MCP against a local database.",
    "Snowflake": "Asking the Snowflake skill a warehouse question, connecting the MCP, checking a cursor-plugin command.",
    "ThoughtSpot": "Searching Visual Embed SDK docs, looking up a REST v2 endpoint, opening a developer guide over MCP.",
    "Gmail": "Searching the inbox for a vendor invoice, drafting a reply on a thread, applying a label after triage.",
    "Google Calendar": "Listing calendars, searching for a free slot, creating or updating a meeting.",
    "Google Drive": "Searching a shared drive, reading a doc, creating a file and sharing it with a collaborator.",
    "Granola": "Pulling what a meeting decided, checking a commitment from last week, attaching the note to a follow-up task.",
    "Notion": "Opening a Notion skill, querying a database over MCP, updating a page the Bot is supposed to own.",
    "Slack": "Searching a channel, sending a status message, performing another Slack action the MCP exposes.",
    "Docusign": "Opening an envelope, filling a template, checking a Maestro workflow or Navigator agreement.",
    "X": "Searching posts for a topic, reading a user's timeline, pulling mentions or a trend.",
    "Amazon Location Service": "Adding a map, geocoding an address, checking the routing SDK setup.",
    "Appwrite": "Opening a project, checking an MCP against a collection, generating the integration the skill recommends.",
    "AWS Amplify": "Scaffolding Auth, adding a data model, wiring a GraphQL API or Lambda.",
    "AWS Core": "Authoring CDK, checking a CloudWatch alarm, looking up an IAM or Bedrock Guardrails step.",
    "AWS Databases": "Choosing a database for a workload, writing a migration, debugging a slow query.",
    "AWS Deployments": "Getting an architecture recommendation, estimating cost, emitting a draw.io diagram.",
    "AWS Serverless": "Designing a Lambda workflow, deploying a function, debugging a cold-start or IAM miss.",
    "Azure": "Managing a resource group, checking a deployment, calling an Azure service from the skill pack.",
    "Browserbase Functions": "Creating a cloud browser function, testing it, publishing a scheduled or webhook-triggered run.",
    "Browserstack": "Running a site on a real device, debugging a failed automated test, managing a test case.",
    "Clerk": "Setting up AuthKit-style auth, checking a framework skill, wiring billing or webhooks.",
    "Cloudflare": "Writing a Worker, checking Durable Objects, using Wrangler or the Agents SDK skill.",
    "CockroachDB": "Exploring a schema, writing distributed SQL, debugging a cluster query.",
    "Convex": "Building a reactive backend, applying a Convex rule, calling the MCP against a deployment.",
    "Coralogix": "Querying logs, checking a RUM span, managing an alert or dashboard.",
    "Datadog": "Querying logs, reading a trace, opening a dashboard from the preview MCP.",
    "Encore": "Inspecting a service, querying the Encore database, calling an endpoint or reading a trace.",
    "Firebase": "Prototyping a backend, checking Auth or Firestore, running the official Firebase skill.",
    "JFrog": "Checking a package, applying a supply-chain skill, using Agent Guard to list MCP servers.",
    "MongoDB": "Connecting with a connection string, exploring collections, generating code against a self-managed server.",
    "Monk.io": "Deploying an app, wiring a SaaS integration, operating a containerized workload from chat.",
    "Neon Postgres": "Creating a branch, checking a project, using the Neon MCP against a database.",
    "Netlify": "Deploying a site, checking functions or edge functions, reading a config or cache skill.",
    "ParadeDB": "Adding full-text search to PostgreSQL, running a vector query, using the docs MCP.",
    "Pinecone": "Creating an index, upserting vectors, running a semantic search or the quickstart.",
    "PlanetScale": "Listing organizations, reading a branch schema, checking Insights data.",
    "Railway": "Deploying a service, checking an environment, troubleshooting a database or network issue.",
    "Redis": "Picking a data structure, running a vector query, applying a caching or performance skill.",
    "Render": "Deploying a service, debugging a failed build, using a Render hook or command.",
    "ScyllaDB": "Setting up ScyllaDB Cloud, modeling CQL, trying Vector Search from the skill pack.",
    "Sentry": "Opening a production error, using the Sentry skill, querying the MCP for a stack trace.",
    "Supabase": "Managing a table, fetching project config, querying data in a project.",
    "Temporal": "Writing a workflow, using the Temporal CLI, checking Temporal Cloud or a local server.",
    "turbopuffer": "Writing a vector query, running full-text search, connecting the turbopuffer integration.",
    "Twilio": "Sending a message, checking Verify or Voice, following the skill for the right API order.",
    "Vantage": "Querying cloud cost, opening a report, checking a budget or recommendation.",
    "Vercel": "Deploying an app, checking a build, configuring a domain or env var.",
    "WorkOS": "Setting up AuthKit or SSO, checking Directory Sync, using the WorkOS MCP against a workspace.",
    "Zscaler": "Auditing a ZPA policy, investigating an incident, onboarding an application across ZIA or ZDX.",
    "1Password": "Looking up an item the Bot is allowed to use, checking a vault, using the 1Password MCP without pasting a secret in chat.",
    "Agent Compatibility": "Scanning a repo for compatibility, auditing startup, checking whether docs still match the code.",
    "Aikido": "Opening a security finding, asking for a remediations path, checking a scan result.",
    "AMD": "Using an AMD skill against a GPU or ROCm workflow, checking a platform guide, generating the recommended setup.",
    "Ashby": "Searching candidates, prepping an interview, moving a pipeline task.",
    "AtScale": "Querying a governed metric, reading a definition, pulling context into a coding task.",
    "Auth0": "Checking an Auth0 skill, wiring a login flow, using the MCP against a tenant.",
    "Browser Use": "Opening a site in Chrome or a cloud browser, filling a form, taking a screenshot of a failing flow.",
    "Buildkite": "Checking a pipeline, reading a build, using the Buildkite MCP from the agent.",
    "Chainguard": "Looking up a hardened image, checking a supply-chain skill, applying a Chainguard recommendation.",
    "Checkmarx": "Asking about a vulnerability, starting a scan, remediating a secret or IaC finding.",
    "Circleback": "Searching a meeting transcript, pulling action items, looking up a person or company from the notes.",
    "Cisco ThousandEyes": "Checking a network test, reading an outage signal, querying ThousandEyes from the agent.",
    "CLI for Agents": "Designing a flag, writing help with an example, adding a dry-run and an idempotent default.",
    "Cloudinary": "Uploading an asset, transforming an image, using the Cloudinary MCP from a media workflow.",
    "CodeRabbit": "Asking for a review comment, checking a finding, using the CodeRabbit skill on a diff.",
    "Continual Learning": "Updating AGENTS.md from a transcript, keeping only high-signal bullets, refusing to dump the whole chat.",
    "Corridor": "Using the Corridor skill on a workflow, checking the MCP, asking the agent to follow the Corridor path.",
    "Cursor SDK": "Selecting a runtime, streaming a run, wiring MCP or auth into a script or CI job.",
    "Cursor Team Kit": "Running an internal CI workflow, applying a review checklist, verifying a ship step.",
    "D&B Commercial Graph": "Looking up a company, walking a commercial-graph edge, pulling a D&B record into research.",
    "D&B Risk Analytics": "Checking a risk score, reading an analytics field, pulling a D&B risk record before a decision.",
    "Databricks": "Querying a workspace, checking a notebook or job, using the Databricks MCP.",
    "Endor Labs Agent Kit": "Running a dependency risk check, reading an Endor finding, applying the agent-kit remediations path.",
    "eToro": "Checking a market or portfolio view the MCP exposes, reading a position, asking a trading-data question.",
    "Falconer": "Reading a Falconer document, searching the set, updating a doc over hosted HTTP MCP.",
    "Forge": "Using the Opsera Forge skill, checking a forge workflow, asking the agent to follow the Forge path.",
    "GitHits": "Asking for code context on a file, pulling the layer a coding agent needs, checking a GitHits result.",
    "GitHub": "Opening a repo, searching issues or PRs, checking an Actions run.",
    "here.now": "Publishing an HTML app to a slug, attaching a custom domain, checking access control or analytics.",
    "HeyGen": "Starting an avatar or video job, checking a HeyGen skill, pulling a generated asset.",
    "Higgsfield": "Kicking off a Higgsfield generation, checking a skill, retrieving the output.",
    "Lovable": "Asking Lovable how to change a generated app, applying a skill, checking the project the plugin targets.",
    "Lucid": "Opening a Lucid diagram, asking the agent to read a board, using the Lucid MCP.",
    "Magic Patterns": "Generating a UI pattern, applying a Magic Patterns skill, checking a component suggestion.",
    "Mainframe": "Using the Mainframe skill on a workflow, checking the MCP, asking the agent to follow the Mainframe path.",
    "Mem0": "Storing a preference, recalling a prior fact, checking what the memory store already has.",
    "Meta Reality Labs": "Debugging a Quest app, checking a Unity or WebXR workflow, running a store-submission check.",
    "Meticulous": "Reviewing a visual-regression run, opening a replay, debugging a screenshot diff.",
    "Microsoft Dataverse": "Querying a Dataverse table, checking a record, using the Dataverse MCP.",
    "Modern Web Guidance": "Asking Chrome's modern-web skill a platform question, checking a guidance page, applying a recommended pattern.",
    "MongoDB Atlas": "Signing into Atlas, exploring a cluster, managing a user, IP access, or collection.",
    "Navan": "Querying an expense, checking a booking against policy, looking up a card or approval.",
    "Nvidia Skills": "Using an NVIDIA skill on a GPU workflow, checking a CUDA or NIM step, applying the recommended pattern.",
    "OneSignal": "Sending a test notification, checking a message, using the OneSignal skill against an app.",
    "Orchestrate": "Fanning a large task across cloud workers, reading a planner handoff, checking a verifier result.",
    "Port": "Querying a software catalog, checking a service, using the Port MCP.",
    "pstack": "Running a deep-first review before speeding up, parallelizing a workflow, asking pstack to raise the quality bar.",
    "QuiverAI": "Using a QuiverAI skill, checking the MCP, asking the agent to follow the Quiver path.",
    "Raisely": "Checking a campaign, using the Raisely skill, querying a fundraising record the MCP exposes.",
    "React Doctor": "Asking why a React tree is slow, applying a doctor finding, checking a recommended fix.",
    "Remotion": "Building a programmatic video, adding captions or audio, applying a Remotion animation skill.",
    "resolve-ai": "Opening a Resolve finding, asking the agent to follow the Resolve skill, checking a result.",
    "resolve-ai-admin": "Using the admin Resolve skill, checking a workspace setting, applying an admin-only action.",
    "Revyl": "Running a Revyl check, reading a finding, applying the skill to a failing flow.",
    "Roboflow": "Searching a vision model, running inference, managing a dataset.",
    "Scandit": "Using a Scandit scanning skill, checking a capture workflow, applying the recommended SDK path.",
    "Semgrep": "Running a Semgrep rule, reading a finding, applying a suggested fix.",
    "Sinch": "Sending a message, checking a Sinch API, using the skill for the right product.",
    "Snyk": "Opening a Snyk finding, applying a secure-development skill, checking a scan.",
    "Snyk API & Web": "Checking an API or web scan, reading a Snyk finding, applying the matching remediations skill.",
    "SonarQube": "Opening a Sonar finding, checking a quality gate, using the SonarSource skill.",
    "Sonatype": "Checking a dependency, reading a Sonatype finding, applying the supply-chain skill.",
    "Subtext": "Driving a hosted browser, capturing before-and-after proof, leaving reviewer evidence against a running app.",
    "Tavily": "Searching the web, extracting a page, grounding an answer with a Tavily result.",
    "Thermos": "Running a thermo-nuclear branch review, applying a harsh rubric, optionally preparing a merge-ready PR.",
    "1inch": "Quoting a Fusion swap, building a limit order, calling a 1inch portfolio or price endpoint.",
    "Airwallex": "Using the Airwallex CLI, checking a payment or payout, applying the Airwallex skill.",
    "Chargebee": "Looking up a billing API pattern, handling a webhook, checking an SDK or schema reference.",
    "Circle": "Building a USDC payment flow, doing a cross-chain transfer, asking the Circle MCP for SDK guidance.",
    "Kraken": "Paper-trading a pair, checking market data, flipping to live only after keys are set.",
    "Phantom": "Checking a wallet address, preparing a swap, reading Phantom docs for a supported chain.",
    "Ramp": "Analyzing spend, checking an approval, cleaning up a transaction or vendor.",
    "RevenueCat": "Configuring a project, reading subscription data, checking a RevenueCat integration.",
    "RevenueCat Play Billing": "Handling a Play purchase, changing a plan or price, checking a webhook or recovery path.",
    "Revolut X": "Using revx for market data, checking a grid-bot strategy, monitoring a crypto pair.",
    "Shopify": "Searching Shopify docs, generating GraphQL or Liquid, validating a UI extension.",
    "Stripe": "Following a Stripe integration skill, checking an API or SDK upgrade, using the Stripe MCP.",
    "Stripe Link": "Requesting a one-time payment credential, completing a purchase the Bot is allowed to make, avoiding a stored card in chat.",
    "Whop": "Launching a site, checking a payment, running an ad or other Whop business action.",
    "Adobe Developer App Builder": "Scaffolding an action, building a React Spectrum UI, running Jest or a CI deploy.",
    "AgentMail": "Creating an inbox, sending or receiving a message, managing a thread.",
    "Airtable": "Reading a base schema, creating a record, using the official Airtable MCP on a shared view.",
    "Asana": "Creating a task, searching a workspace, updating a project.",
    "Atlassian": "Opening a Jira issue, writing a Confluence page, running a backlog or status-report skill.",
    "Atlassian Forge": "Building a Forge app, deploying it, troubleshooting with the Forge MCP.",
    "Atlassian Teamwork Graph": "Drafting a Jira issue from a PR, linking it to an epic, running /twg-setup after install.",
    "Box": "Searching Box, reading a file, asking Box AI to summarize or extract.",
    "Canva": "Creating a design, resizing it, running a brand check over the Canva MCP.",
    "ChatPRD": "Writing a PRD from code context, implementing against a spec, checking whether a change matches the requirement.",
    "ClickUp": "Creating a task, tracking time, searching a ClickUp workspace.",
    "GitBook": "Authoring a GitBook page, setting up Git Sync, applying branding or GitBook-flavored Markdown.",
    "GitLab": "Opening an issue, checking a merge request, reading a pipeline from the GitLab MCP.",
    "Glean": "Searching documents, Slack, or email, exploring code across repos, finding an expert.",
    "GSAP": "Writing a timeline, adding ScrollTrigger, applying a React or performance skill.",
    "Harness": "Building or deploying via Harness, debugging a pipeline, using the Harness MCP.",
    "IcePanel": "Updating a landscape model, adding a connection, asking IcePanel about a system.",
    "LaunchDarkly": "Managing a flag, checking an AI configuration, using the LaunchDarkly MCP.",
    "Linear": "Creating an issue, updating a project, reading a Linear document.",
    "MagicPath": "Bringing UI onto the canvas, applying a design-system theme, shipping a component back into code.",
    "Mintlify": "Looking up a Mintlify site pattern, checking a docs reference, applying an authoring skill.",
    "Miro": "Reading a board, creating a diagram, generating code from board context.",
    "Monday.com": "Running a morning briefing, diagnosing a board, turning a meeting into an opportunity.",
    "Paper": "Reading a canvas the Bot can write to, updating a design on web standards, checking what Paper already has.",
    "Playwright": "Navigating a page, clicking and filling a form, taking a snapshot or running an e2e check.",
    "Resend": "Sending an email, checking a template, using React Email or a deliverability skill.",
    "Sanity": "Querying content, applying a Sanity skill, using the MCP against a studio.",
    "Svelte": "Asking a Svelte skill, using the Svelte MCP, applying a Svelte-specific pattern.",
    "TierZero": "Investigating a production issue, using existing observability, writing back to the knowledge base.",
    "tldraw": "Drawing on a shared canvas, collaborating with the agent, leaving a visual note in the editor.",
    "Webflow": "Managing CMS items, auditing a site, optimizing an asset before publish.",
    "Wix": "Building a dashboard extension, calling a backend API, managing a site over the Wix MCP.",
    "Zapier": "Discovering an action, enabling it, executing a Zapier step from the client.",
    "Apollo.io": "Searching prospects, enriching a contact or company, adding to a list or sequence.",
    "Clay": "Finding a person across providers, running a research agent, triggering an approved Clay workflow.",
    "Gong": "Pulling an account summary, reading deal insight, opening a call brief.",
    "HubSpot": "Searching a contact, updating a deal, working a ticket or marketing email.",
    "Salesforce": "Querying a record, creating or updating an object, traversing related records in the org.",
    "ZoomInfo": "Building a prospect list, enriching a record, prioritizing an account by intent.",
    "Zoom": "Searching meetings, pulling a recording summary or transcript, opening a Zoom Doc.",
}


def parse_roster(text: str) -> list[tuple[str, str]]:
    cats: list[str] = []
    rows: list[tuple[str, str]] = []
    cur = None
    for ln in text.splitlines():
        m = re.match(r"^### (.+?) \(\d+\)\s*$", ln)
        if m:
            cur = m.group(1)
            cats.append(cur)
            continue
        m = re.match(r"^- (.+?)(?: ✅ installed)?\s*$", ln)
        if m and cur:
            rows.append((m.group(1).strip(), cur))
    return rows


def parse_market(text: str) -> dict[str, dict[str, str]]:
    pat = re.compile(
        r"\n([^\n\[]{1,80})\n\n([^\n\[]{10,1200})\]\((/marketplace/[^)]+)\)"
    )
    out: dict[str, dict[str, str]] = {}
    for name, desc, slug in pat.findall(text):
        name = name.strip()
        if slug.startswith("/marketplace/automations/") or slug == "/marketplace/publish":
            continue
        out[name.lower()] = {
            "name": name,
            "desc": " ".join(desc.split()),
            "slug": slug,
        }
    return out


def clean_desc(raw: str, name: str) -> str:
    s = " ".join(raw.split())
    s = s.replace("—", " - ").replace("–", " - ").replace(" -- ", " - ")
    s = s.replace("*", "")
    s = s.replace("Postgres", "PostgreSQL")
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("Helps Claude assist", "Helps an agent assist")
    s = s.replace("Makes Claude fluent", "Makes the agent fluent")
    s = re.sub(rf"^{re.escape(name)}\s*·\s*", "", s).strip()
    if s.lower().startswith(name.lower()):
        rest = s[len(name) :].lstrip()
        rest = re.sub(r"^(?:'s|’s)\s+", "", rest)
        rest = re.sub(r"^(?:is|are)\s+", "", rest, flags=re.I)
        rest = re.sub(
            r"^(?:plugin|skills?|MCP(?: server)?|integration|CLI plugin|Cursor plugin)"
            r"(?:\s+for\s+Cursor)?[:.\-]?\s*",
            "",
            rest,
            flags=re.I,
        )
        if rest:
            s = rest[0].upper() + rest[1:]
    if not s.endswith((".", "!", "。")):
        s += "."
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    if len(s) > 300:
        cut = s[:300]
        for sep in (". ", "; ", " - "):
            idx = cut.rfind(sep)
            if idx >= 80:
                s = cut[: idx + (1 if sep == ". " else 0)].rstrip(" ,;")
                if not s.endswith((".", "!", "。")):
                    s += "."
                break
        else:
            s = cut.rsplit(" ", 1)[0].rstrip(" ,;") + "."
    return s


def use_case_for(name: str, desc: str) -> str:
    if name in USE_CASES:
        return USE_CASES[name]
    # Fallback: turn the first capability clause into gerund fragments.
    body = desc
    if " - " in body:
        body = body.split(" - ", 1)[1]
    body = re.sub(r"\s+via\s+.*$", "", body)
    body = body.rstrip(".")
    parts = re.split(r",| and ", body)
    parts = [p.strip(" .") for p in parts if p.strip() and len(p.strip()) > 3]
    frags = []
    for p in parts[:3]:
        words = p.split()
        w0 = words[0].lower()
        if w0.endswith("ing"):
            ger = p[0].upper() + p[1:] if p[0].islower() else p
        elif w0.endswith("e") and w0 not in {"the", "a", "an"}:
            ger = w0[:-1] + "ing " + " ".join(words[1:])
            ger = ger[0].upper() + ger[1:]
        else:
            ger = w0 + "ing " + " ".join(words[1:])
            ger = ger[0].upper() + ger[1:]
        ger = re.sub(r"\b(your|our|you)\b", "a", ger, flags=re.I)
        frags.append(ger.strip(" ."))
    if not frags:
        return f"Using {name} from a Grok Bot task against the connected account."
    out = ", ".join(frags) + "."
    if "*" in out:
        out = out.replace("*", "")
    return out


def marker_for(slug: str) -> str | None:
    return "C" if slug.startswith("/marketplace/cursor/") else None


def main() -> None:
    roster = parse_roster(ROSTER.read_text(encoding="utf-8"))
    market = parse_market(MARKET.read_text(encoding="utf-8"))
    vendor_raw = json.loads(VENDOR_URLS.read_text(encoding="utf-8"))
    vendor_map = {k: v for k, v in vendor_raw.items() if not k.startswith("_")}

    categories: list[str] = []
    seen_cat: set[str] = set()
    for _, cat in roster:
        if cat not in seen_cat:
            categories.append(cat)
            seen_cat.add(cat)

    plugins = []
    tsv_rows = ["name\tcategory\tslug\turl\tmarker"]
    missing = []
    for name, cat in roster:
        hit = market.get(name.lower())
        slug = SLUG_OVERRIDES.get(name) or (hit["slug"] if hit else None)
        if not slug:
            missing.append(name)
            continue
        raw = DESC_OVERRIDES.get(name) or (hit["desc"] if hit else "")
        if not raw:
            missing.append(name)
            continue
        desc = clean_desc(raw, name)
        uc = use_case_for(name, desc)
        if not uc.endswith((".", "!", "。")):
            uc += "."
        market_url = "https://cursor.com" + slug
        url = vendor_map.get(name, market_url)
        mk = marker_for(slug)
        plugins.append(
            {
                "name": name,
                "url": url,
                "marker": mk,
                "category": cat,
                "description": desc,
                "use_case": uc,
                "slug": slug.removeprefix("/marketplace/"),
            }
        )
        tsv_rows.append(f"{name}\t{cat}\t{slug}\t{url}\t{mk or ''}")

    if missing:
        raise SystemExit(f"unresolved plugins: {missing}")

    data = {
        "meta": {
            "last_updated": "August 12, 2026",
            "capture_date": "2026-08-12",
            "render": {
                "category_counts": True,
                "subcategory_headings": False,
            },
        },
        "categories": categories,
        "plugins": plugins,
        "held": [],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    TSV.write_text("\n".join(tsv_rows) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(plugins)} plugins, {len(categories)} categories)")
    print(f"wrote {TSV}")


if __name__ == "__main__":
    main()
