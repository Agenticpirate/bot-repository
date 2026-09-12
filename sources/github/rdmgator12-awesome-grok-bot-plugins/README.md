# Awesome List for Grok Bot Plugins [![Awesome](https://awesome.re/badge.svg)](https://awesome.re) [![Last Commit](https://img.shields.io/github/last-commit/rdmgator12/awesome-grok-bot-plugins)](https://github.com/rdmgator12/awesome-grok-bot-plugins/commits/main)

<p align="center">
  <img src="media/banner.svg" alt="Awesome Grok Bot Plugins" width="800">
</p>

> A directory of the plugins in [Grok Bot](https://x.ai/bot)'s in-app marketplace (Settings, Plugins) — 219 listings across the 2026-08-12 catalog capture, plus 0 held pending marketplace-URL verification, organized by the catalog's own categories with descriptions and use cases.

**Last updated:** August 12, 2026 | **Plugins tracked:** 219 listed + 0 held | **Categories:** 13

xAI's teammate product: named agents on a persistent cloud computer. The full model, eligibility, and how plugins fit are in What is Grok Bot, first section below.

This list is maintained weekly. To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md).

> This is an independent, community-maintained list. Not affiliated with, endorsed by, or sponsored by xAI Corp, X.AI LLC, Cursor (Anysphere), SpaceX, or any Musk-affiliated entity. "Grok", "Grok Bot", and related marks are the property of xAI. "Cursor" is the property of Anysphere. Each plugin is the property of its respective owner.

> [!TIP]
> ### Plugin Snap Stack — August 12, 2026
>
> Same format as the connector lists: a persona plus a small stack that clicks together. Past stacks will live in [docs/stacks](docs/stacks/). Sweep history lives in the [changelog](docs/CHANGELOG.md).
>
> **The overnight sales outbound Bot** — Apollo.io · Clay · Gong · HubSpot · running on **Grok Bot**
>
> One Bot, four plugins: research and score accounts in Apollo, enrich the shortlist in Clay, pull the last-call brief from Gong, then write the CRM note and next step in HubSpot before asking for approval on the outbound draft. Composed from the day-0 Grok Bot catalog, not yet field-tested — if you run it on a live book, send a Field Report (see CONTRIBUTING).
>
> Disclaimer: This is a free, public, community-maintained list. Not affiliated with, endorsed by, or sponsored by Grok, xAI Corp, SpaceX, or any Musk-affiliated entity. "Grok" and related marks are the property of xAI Corp. Each connector is the property of its respective owner. No fees, no paid placement, no commercial relationship with any vendor listed.

---

## Contents

- [What is Grok Bot](#what-is-grok-bot)
- [Agent Orchestration](#agent-orchestration)
- [Canvas](#canvas)
- [Customer Support](#customer-support)
- [Data Analytics](#data-analytics)
- [Featured](#featured)
- [Finance And Legal](#finance-and-legal)
- [Inbox And Collaboration](#inbox-and-collaboration)
- [Infrastructure](#infrastructure)
- [MCP](#mcp)
- [Payments](#payments)
- [Productivity](#productivity)
- [Sales](#sales)
- [Scheduling](#scheduling)
- [Held for Verification](#held-for-verification)
- [Related](#related)

---

## What is Grok Bot

[Grok Bot](https://x.ai/news/introducing-grok-bot) is xAI's teammate product, opened as an early beta on August 11, 2026. It is not a chat window with a few tools bolted on. Each Bot is a named, persistent agent that works on a **cloud computer of its own** — browser, filesystem, and terminal — and keeps working after the laptop closes.

You message a Bot the way you would text a colleague. A good handoff names the outcome, the apps or files it should use, the constraints, the deliverable, and when to stop for approval. The Bot then signs into those tools and finishes the work *in the actual product*, not as a draft in chat. Passwords, passkeys, 2FA, CAPTCHAs, and payments stay with you: the Bot pauses, you take over the computer for that step, then you hand it back. xAI's own framing is the last ten percent: most assistants get a task almost done; a Bot is supposed to land it where a human would put it.

All Bots on an account share one computer. Browser sessions, `/workspace` files, and CLI credentials are account-scoped, not Bot-scoped. That is why a handoff works without re-setup, and why a login you complete for one Bot is available to the others. Several Bots can run in parallel, message each other, and sit in a group thread. Focused Bots (sales outbound, inbox, bug reproduction) beat one catch-all.

Show a Bot a workflow once and it can save that path as a **routine** and re-run it on a schedule. Over time it keeps memory, preferences, files, and signed-in sessions, so the second Friday close is cheaper than the first.

**Who can use it today.** SuperGrok Heavy, Cursor Ultra, and Cursor Teams Premium. Desktop apps for macOS and Windows, plus iOS. No Linux desktop app yet. Enterprise is a waitlist. Grok Bot requires cloud data storage; Cursor Legacy Privacy Mode accounts have to move to a supported data setting before a Bot will start.

**How plugins fit.** In the app, structured connections appear under **Settings, Plugins**. They are [Cursor Marketplace](https://cursor.com/marketplace) bundles — skills, MCP servers, slash commands, and related agent primitives. After install, `@` attaches a plugin to the task and `/` calls a saved skill. Prefer a plugin when one exists: it is usually more reliable than clicking through a website. Use the Bot's browser for services without a plugin, or for visual workflows the plugin does not expose. Installed plugins are account-wide.

> [!IMPORTANT]
> Four xAI surfaces, four jobs. This list is only Grok Bot's plugin catalog.
>
> - **Grok** (grok.com) is the chat assistant.
> - **Grok Connectors** are OAuth tiles *inside that chat* — email, calendar, files. Tracked in awesome-grok-connectors (see Related).
> - **Grok Build** is the local terminal coding agent, with its own marketplace at `xai-org/plugin-marketplace`.
> - **Grok Bot** is a team of cloud-computer agents. Plugins here are how a Bot gets a structured hook into a supported service. The public listing lives on the Cursor Marketplace; the inclusion gate for *this* list is the Grok Bot in-app catalog (Settings, Plugins).
>
> A plugin is not required to use a Bot. Computer-use covers apps with no API. The catalog below is the structured layer.

## Agent Orchestration

19 plugins.

- [Arize](https://arize.com) - Add Arize AX observability to LLM applications - auto-instrumentation, trace export, dataset management, experiment workflows, prompt optimization, and deep linking via the ax CLI. *Use case: Exporting traces from a failing eval run, comparing two prompt versions, opening the deep link to the span that blew the score.*
- [Atlan](https://atlan.com) - Enterprise context layer for governed metadata, lineage, glossaries, and SQL over organization knowledge repos. *Use case: Looking up the glossary definition before writing a join, walking lineage from a broken dashboard metric, running a governed SQL check.*
- [AWS Agents](https://aws.amazon.com/bedrock/agentcore/) - Build, deploy, and operate AI agents on AWS. Skills for scaffolding agents with Amazon Bedrock AgentCore (Strands, LangGraph), connecting tools via Gateway and MCP, multi-agent and A2A orchestration, memory, Cedar policies, evaluation, observability, debugging traces and logs, and production. *Use case: Scaffolding a Bedrock AgentCore worker, attaching a Gateway tool, reading a trace after a failed multi-agent handoff.*
- [AWS SageMaker](https://aws.amazon.com/sagemaker/) - Build, train, and deploy AI models with deep AWS AI/ML expertise brought directly into your coding assistants, covering the surface area of Amazon SageMaker AI. *Use case: Choosing a training job type, checking why a hosted endpoint drifted, generating the deploy config for a new model.*
- [Browserbase Browse](https://www.browserbase.com) - Browser automation for Cursor. Navigate, click, fill forms, extract data, capture network, manage tabs, and take screenshots - powered by browse-cli and controlled via MCP. *Use case: Opening a staging URL, filling a form the API does not expose, capturing the network call that failed checkout.*
- [Composio](https://composio.dev) - Connect and operate 1000+ external apps from Cursor via the Composio MCP server. Managed OAuth, intelligent tool routing, and a remote sandbox for bulk data processing. *Use case: Connecting a SaaS account over managed OAuth, routing a tool call to the right app, running a bulk pull in the remote sandbox.*
- [Context7](https://context7.com) - Upstash Context7 MCP server for up-to-date documentation lookup. Pull version-specific documentation and code examples directly from source repositories into your LLM context. *Use case: Pulling the current SDK page for a library, grabbing a version-specific example, checking whether a method still exists.*
- [Create Plugin](https://cursor.com/marketplace/cursor/create-plugin) **`C`** - Scaffold and validate new agent plugins. Handles directory setup, manifest generation, and pre-submission quality checks for the marketplace. *Use case: Scaffolding a new marketplace plugin, generating the manifest, running the pre-submit quality checks.*
- [DataRobot](https://www.datarobot.com) - A collection of DataRobot agent skills for model training, deployment, predictions, monitoring, and more. *Use case: Kicking off a training job, checking a deployment's prediction health, pulling a monitoring alert.*
- [Firetiger](https://www.firetiger.com) - Cursor plugin for Firetiger agentic operations plugin with skills and MCP access. *Use case: Asking the ops agent what is on fire, pulling the skill that matches an incident, querying MCP for the latest signal.*
- [Langfuse](https://langfuse.com) - Skills for working with Langfuse - the open-source LLM engineering platform for tracing, prompt management, and evaluation. *Use case: Inspecting a trace for a bad generation, pulling the current prompt version, comparing eval scores across two runs.*
- [Opsera](https://www.opsera.io) - DevSecOps agent for architecture analysis, security scanning, compliance auditing, and SQL security review. *Use case: Running an architecture scan, checking a SQL query for a security finding, reading a compliance audit result.*
- [Parallel](https://parallel.ai) - Web search, content extraction, deep research, and data enrichment powered by parallel-cli. *Use case: Running a deep-research pass on a competitor, extracting structured fields from a set of pages, enriching a lead list.*
- [Runlayer](https://www.runlayer.com) - Simpler, safer way to run MCPs, Skills, and Agents. Discover what's running, enforce security policies in real time, protect secrets, and get full audit trails - all built for how developers actually work in Cursor. *Use case: Listing what MCP servers are live, blocking a tool that would leak a secret, pulling the audit trail after a run.*
- [shadcn/ui](https://ui.shadcn.com) - UI component and design system framework. Search registries, install components as source code, and audit your project. *Use case: Searching a registry for a component, installing it as source, auditing which components a project already uses.*
- [Sourcegraph](https://sourcegraph.com) - Code search plus an MCP server and slash commands for navigating large codebases from the agent. *Use case: Searching a symbol across repos, opening the MCP result for a call site, running a slash command against the graph.*
- [Superpowers](https://github.com/obra/superpowers) - Core skills library: TDD, debugging, collaboration patterns, and proven techniques. *Use case: Starting a TDD loop on a failing test, using a debugging pattern mid-incident, handing off a collaboration checklist.*
- [Tabnine](https://www.tabnine.com) - Search, explore, and investigate your team's remote repositories using Tabnine's Context Engine. Enables semantic code search, symbol lookup, file navigation, and OpenAPI spec querying across all indexed repositories. Includes AI coaching to help your team write better code. *Use case: Semantically searching a remote repo, looking up a symbol, asking for a coaching note on a PR.*
- [Tabnine Context Engine](https://www.tabnine.com/enterprise-context-engine/) - Context Engine CLI (ctx-cli) as focused skills - guided tenant onboarding, code & knowledge-graph search, service investigation, CVE & SAST triage with ready-to-apply fixes, and coding-guideline checks. *Use case: Onboarding a tenant, walking a service in the knowledge graph, applying a suggested CVE fix.*

## Canvas

2 plugins.

- [Docs Canvas](https://cursor.com/marketplace/cursor/docs-canvas) **`C`** - Render documentation - architecture notes, API references, runbooks, and codebase walkthroughs - as a navigable canvas with sections, table of contents, diagrams, and cross-references. *Use case: Opening an architecture note as a canvas, jumping a TOC section, following a cross-reference to a runbook.*
- [PR Review Canvas](https://cursor.com/marketplace/cursor/pr-review-canvas) **`C`** - Render PR diffs as interactive canvases organized for reviewer comprehension - groups changes by importance, separates boilerplate from core logic, and highlights tricky or unexpected code. *Use case: Grouping a noisy diff by importance, hiding generated boilerplate, highlighting the unexpected branch.*

## Customer Support

2 plugins.

- [Intercom](https://www.intercom.com) **`C`** - Connect to Intercom - search conversations and contacts, look up companies, and manage Help Center articles - via Intercom's official remote MCP server. *Use case: Finding a conversation by customer email, looking up the company record, updating a Help Center article.*
- [Plain](https://www.plain.com) - Connect Cursor to Plain - manage support threads, customers, tenants, and help center articles directly from your editor. *Use case: Opening a support thread, attaching it to a tenant, editing the help-center article that should have answered it.*

## Data Analytics

29 plugins.

- [Amplitude](https://amplitude.com) - Use Amplitude like an expert - instrument analytics, discover product opportunities, analyze charts, create dashboards, manage experiments, and understand users and accounts. *Use case: Instrumenting a new event, reading a chart that dropped, checking an experiment before a flag flip.*
- [Antimetal](https://antimetal.com) - Bring Antimetal's software investigation intelligence into your editor. Triage problems, investigate root causes, and apply remediations without leaving Cursor. *Use case: Triaging a production error, walking the suggested root cause, applying the remediation in the same session.*
- [Apify](https://apify.com) - Official Apify agent skills for web scraping, data extraction, and automation. *Use case: Starting a scrape actor, extracting a structured table, checking why a run stopped mid-crawl.*
- [Astronomer](https://www.astronomer.io) - Data engineering plugin - warehouse exploration, pipeline authoring, Airflow integration. *Use case: Exploring a warehouse schema, authoring a pipeline, checking an Airflow DAG that missed its slot.*
- [AWS Data Analytics](https://aws.amazon.com/big-data/datalakes-and-analytics/) - Data lake, analytics, and ETL workflows with S3 Tables, AWS Glue, and Athena. Covers managed Iceberg tables on S3 Tables, ingestion from JDBC databases (Oracle, SQL Server, PostgreSQL, MySQL, RDS), Amazon Redshift, Snowflake, BigQuery, and DynamoDB, AWS Glue Data Catalog inventory and asset. *Use case: Inventorying Glue tables, writing a federated Athena query, checking an S3 Tables Iceberg load.*
- [Azure Cosmos DB](https://azure.microsoft.com/en-us/products/cosmos-db) - Access your Azure Cosmos DB accounts and perform tasks like managing databases, querying data, vector search, and schema discovery. *Use case: Listing databases in an account, running a vector search, discovering a container schema.*
- [Braintrust](https://www.braintrust.dev) - Connect Cursor to Braintrust for AI-powered access to your projects, experiments, and evaluation logs. *Use case: Opening an experiment, reading evaluation logs, comparing two project runs.*
- [Bright Data](https://brightdata.com) - Web search, content extraction, structured data, and browser automation powered by Bright Data's web intelligence platform. *Use case: Searching the live web, extracting a structured product page, driving a browser step the site blocks.*
- [ClickHouse](https://clickhouse.com) - Skills, rules, and MCP for ClickHouse best practices from the agent. *Use case: Writing a query against a merge tree, checking a best-practice rule, connecting the MCP server to a cluster.*
- [Confidence by Spotify](https://confidence.spotify.com) - Access Confidence feature flags, experiments, and migration tools directly from Cursor. *Use case: Reading a feature flag, checking an experiment allocation, running a migration tool against a flag.*
- [Dagster](https://dagster.io) - Expert guidance for working with Dagster and the dg CLI. *Use case: Asking how a dg CLI command works, checking a software-defined asset, debugging a failed materialization.*
- [dbt Labs](https://www.getdbt.com) - Agent skills for dbt: data modeling, analytics engineering, semantic layer metrics, unit testing, job troubleshooting, and dbt MCP server setup. Covers dbt Core and dbt Cloud workflows. *Use case: Modeling a new mart, writing a semantic-layer metric, troubleshooting a Cloud job that went red.*
- [Elastic](https://www.elastic.co) - Skills and docs for Elasticsearch, Kibana, Observability, Security, ES|QL, OpenTelemetry, and MCP access. *Use case: Looking up an ES|QL example, checking OpenTelemetry docs, pulling the MCP page for a Kibana task.*
- [Exa](https://exa.ai) - Web search and content extraction powered by Exa AI. *Use case: Searching the web for a primary source, extracting the page body, checking a claim against live results.*
- [Firecrawl](https://www.firecrawl.dev) - Web scraping, crawling, and search for AI agents. Gives Cursor full access to web content through the Firecrawl CLI. *Use case: Scraping a docs site, crawling a sitemap, searching a domain the Bot's browser cannot finish.*
- [Grafana Cloud](https://grafana.com/products/cloud/) - Hosted MCP server for AI-assisted Grafana Cloud observability - no local installation required. *Use case: Querying a hosted Grafana MCP, checking an alert, reading a dashboard the local CLI does not have.*
- [Grafana Labs](https://grafana.com) - Skills and rules for developing and using the Grafana Assistant app and CLI. *Use case: Working on a Grafana Assistant app, checking a CLI command, applying a rule from the skill pack.*
- [Hex](https://hex.tech) - AI analytics and data collaboration - connect Cursor to your Hex workspace with MCP. *Use case: Opening a Hex workspace over MCP, asking about a notebook, sharing a result back into the project.*
- [Hugging Face](https://huggingface.co) - Agent Skills for AI/ML tasks including dataset creation, model training, evaluation, and research paper publishing on Hugging Face Hub. *Use case: Creating a dataset card, kicking off a training run, publishing an eval to the Hub.*
- [Mixpanel](https://mixpanel.com) - Skills for tracking implementation and metric investigation. *Use case: Checking why a tracking call is missing, investigating a metric dip, implementing a new event.*
- [Observe by Snowflake](https://www.snowflake.com/en/product/observe/) - Agent skills and MCP configuration for deploying and managing Observe's observability infrastructure. *Use case: Deploying Observe infra, checking an MCP config, reading an observability skill for a service.*
- [Omni](https://omni.co) - Explore, query, model, embed, and manage Omni Analytics through the REST API and embed SDK. *Use case: Exploring a model, running a query, publishing a dashboard from the embed SDK.*
- [OpenSearch](https://opensearch.org) - Skills for search apps, log analytics, traces, and deploys to Amazon OpenSearch Service or Serverless. *Use case: Standing up a hybrid search app, querying logs with PPL, deploying to OpenSearch Serverless.*
- [Pendo](https://www.pendo.io) - Bring Pendo analytics into Cursor with skills for account health, feature adoption, session replays, and feedback analysis. *Use case: Checking feature adoption, watching a session replay, reading account-health feedback.*
- [PostHog](https://posthog.com) - Access PostHog analytics, feature flags, experiments, error tracking, and insights directly from Cursor. *Use case: Reading a funnel, flipping a feature flag, opening an error-tracking issue.*
- [Postman](https://www.postman.com) - Full API lifecycle management for Cursor. Sync collections, generate OpenAPI specs, discover APIs, run tests and Flows, create mocks, improve docs, and audit security. Powered by the Postman MCP Server. *Use case: Syncing a collection, generating an OpenAPI spec, running a Flow against a staging API.*
- [Prisma](https://www.prisma.io) - The official Prisma plugin for Cursor: MCP server integration, rules, skills, and automation for database development. *Use case: Updating a schema, applying a Prisma rule, running the MCP against a local database.*
- [Snowflake](https://www.snowflake.com) - A Snowflake skill and MCP server for warehouse questions and account work from the agent. *Use case: Asking the Snowflake skill a warehouse question, connecting the MCP, checking a cursor-plugin command.*
- [ThoughtSpot](https://www.thoughtspot.com) - Developer documentation search across Visual Embed SDK, REST API v2, and guides over MCP. *Use case: Searching Visual Embed SDK docs, looking up a REST v2 endpoint, opening a developer guide over MCP.*

## Featured

6 plugins.

- [Gmail](https://mail.google.com) **`C`** - Connect to Gmail via Google's remote MCP server - search, read, draft, label, and manage email. *Use case: Searching the inbox for a vendor invoice, drafting a reply on a thread, applying a label after triage.*
- [Google Calendar](https://calendar.google.com) **`C`** - Connect to Google Calendar via Google's remote MCP server - list calendars, search events, and create or update meetings. *Use case: Listing calendars, searching for a free slot, creating or updating a meeting.*
- [Google Drive](https://drive.google.com) **`C`** - Connect to Google Drive via Google's remote MCP server - search, read, create, share, and manage files. *Use case: Searching a shared drive, reading a doc, creating a file and sharing it with a collaborator.*
- [Granola](https://granola.ai) - Your meetings in your workflow. Granola gives Cursor access to what your team discussed, decided, and committed to. *Use case: Pulling what a meeting decided, checking a commitment from last week, attaching the note to a follow-up task.*
- [Notion](https://www.notion.so) - Packaged Notion skills plus the Notion MCP server. *Use case: Opening a Notion skill, querying a database over MCP, updating a page the Bot is supposed to own.*
- [Slack](https://slack.com) - MCP server for searching channels, sending messages, and other Slack actions from MCP-compatible clients. *Use case: Searching a channel, sending a status message, performing another Slack action the MCP exposes.*

## Finance And Legal

1 plugin.

- [Docusign](https://www.docusign.com) **`C`** - Connect to Docusign - work with eSignature envelopes and templates, Maestro workflows, and Navigator agreements - via Docusign's official remote MCP server (beta). *Use case: Opening an envelope, filling a template, checking a Maestro workflow or Navigator agreement.*

## Inbox And Collaboration

1 plugin.

- [X](https://x.com) **`C`** - Read-only access to the X API - search posts and users, read timelines and mentions, and pull trends and news - via X's official hosted MCP server. *Use case: Searching posts for a topic, reading a user's timeline, pulling mentions or a trend.*

## Infrastructure

39 plugins.

- [Amazon Location Service](https://aws.amazon.com/location) - Guide developers through adding maps, places search, geocoding, routing, and other geospatial features with Amazon Location Service, including authentication setup, SDK integration, and best practices. *Use case: Adding a map, geocoding an address, checking the routing SDK setup.*
- [Appwrite](https://appwrite.io) - The Appwrite plugin for Cursor includes skills and MCP servers, allowing AI agents to access your projects and correctly integrate with your projects. *Use case: Opening a project, checking an MCP against a collection, generating the integration the skill recommends.*
- [AWS Amplify](https://aws.amazon.com/amplify/) - Build full-stack apps with AWS Amplify Gen 2 using guided workflows for authentication, data models, storage, GraphQL APIs, and Lambda functions. *Use case: Scaffolding Auth, adding a data model, wiring a GraphQL API or Lambda.*
- [AWS Core](https://aws.amazon.com) - Build, deploy, and operate applications on AWS. Skills to author infrastructure-as-code (CDK, CloudFormation), use core services (Lambda, API Gateway, Step Functions, ECS/Fargate, ECR, IAM, Amazon Bedrock with Knowledge Bases and Guardrails, Amplify), and complete common tasks across observability. *Use case: Authoring CDK, checking a CloudWatch alarm, looking up an IAM or Bedrock Guardrails step.*
- [AWS Databases](https://aws.amazon.com/products/databases/) - Expert database guidance for the AWS database portfolio. Design schemas, execute queries, handle migrations, and choose the right database for your workload. *Use case: Choosing a database for a workload, writing a migration, debugging a slow query.*
- [AWS Deployments](https://aws.amazon.com/architecture/) - Deploy applications to AWS with architecture recommendations, cost estimates, and IaC deployment. Generate validated AWS architecture diagrams as draw.io XML. *Use case: Getting an architecture recommendation, estimating cost, emitting a draw.io diagram.*
- [AWS Serverless](https://aws.amazon.com/serverless/) - Design, build, deploy, test, and debug serverless applications with AWS Serverless services. *Use case: Designing a Lambda workflow, deploying a function, debugging a cold-start or IAM miss.*
- [Azure](https://azure.microsoft.com/en-us) - Microsoft Azure MCP and Skills integration for cloud resource management, deployments, and Azure services. Manage your Azure infrastructure, monitor applications, and deploy resources directly from Cursor. *Use case: Managing a resource group, checking a deployment, calling an Azure service from the skill pack.*
- [Browserbase Functions](https://www.browserbase.com/features) - Deploy serverless browser automation to Browserbase cloud. Create, test, and publish cloud functions for scheduled or webhook-triggered browser tasks. *Use case: Creating a cloud browser function, testing it, publishing a scheduled or webhook-triggered run.*
- [Browserstack](https://www.browserstack.com) - Test websites and mobile apps on real devices, run automated tests, debug failures, and manage test cases. *Use case: Running a site on a real device, debugging a failed automated test, managing a test case.*
- [Clerk](https://clerk.com) - Authentication toolkit with setup guides, an MCP server, and skills for frameworks, mobile, organizations, billing, and webhooks. *Use case: Setting up AuthKit-style auth, checking a framework skill, wiring billing or webhooks.*
- [Cloudflare](https://www.cloudflare.com) - Skills for the Cloudflare developer platform: Workers, Durable Objects, Agents SDK, MCP servers, Wrangler CLI, and web performance. *Use case: Writing a Worker, checking Durable Objects, using Wrangler or the Agents SDK skill.*
- [CockroachDB](https://www.cockroachlabs.com) - Explore schemas, write optimized SQL, debug queries, and manage distributed database clusters. *Use case: Exploring a schema, writing distributed SQL, debugging a cluster query.*
- [Convex](https://convex.dev) - Official Convex plugin for Cursor - reactive backend development with TypeScript, including rules, skills, MCP integration, and automation hooks. *Use case: Building a reactive backend, applying a Convex rule, calling the MCP against a deployment.*
- [Coralogix](https://coralogix.com) - Connects Cursor to the Coralogix Observability MCP Server, letting your AI agent query logs, metrics, traces, and RUM, manage alerts and dashboards - all without leaving the editor. *Use case: Querying logs, checking a RUM span, managing an alert or dashboard.*
- [Datadog](https://www.datadoghq.com) - Use Datadog directly in Cursor through a preconfigured Datadog MCP server. Query logs, metrics, traces, dashboards, and more through natural conversation. This plugin is in preview. *Use case: Querying logs, reading a trace, opening a dashboard from the preview MCP.*
- [Encore](https://encore.dev) - Build backends in TypeScript and Go with automatic infrastructure. Includes MCP integration for inspecting services, querying databases, analyzing traces, and calling endpoints. Plus rules, skills, and commands for the full Encore workflow. *Use case: Inspecting a service, querying the Encore database, calling an endpoint or reading a trace.*
- [Firebase](https://firebase.google.com) - The official Firebase Cursor plugin. Prototype, build, and run modern apps with Firebase's backend and AI infrastructure. *Use case: Prototyping a backend, checking Auth or Firestore, running the official Firebase skill.*
- [JFrog](https://jfrog.com) - Platform integration with MCP, security skills, Agent Package Resolution, supply-chain practices, and Agent Guard governance. *Use case: Checking a package, applying a supply-chain skill, using Agent Guard to list MCP servers.*
- [MongoDB](https://www.mongodb.com) - Connect to any MongoDB deployment (Community, Enterprise Advanced, local dev container via Atlas CLI or Atlas clusters) through a self-managed MongoDB MCP Server using your connection string. Explore data, manage collections, optimize queries, and generate reliable code with MongoDB best practices. *Use case: Connecting with a connection string, exploring collections, generating code against a self-managed server.*
- [Monk.io](https://www.monk.io) - Deploy and operate full applications with Monk - cloud infra, SaaS integrations, and containerized workloads - from one chat. *Use case: Deploying an app, wiring a SaaS integration, operating a containerized workload from chat.*
- [Neon Postgres](https://neon.tech) - Manage your Neon projects, databases, and branches with the Neon agent skills and the Neon MCP Server. *Use case: Creating a branch, checking a project, using the Neon MCP against a database.*
- [Netlify](https://www.netlify.com) - Platform skills for functions, edge functions, blobs, identity, image CDN, forms, config, CLI, frameworks, caching, and deploys. *Use case: Deploying a site, checking functions or edge functions, reading a config or cache skill.*
- [ParadeDB](https://www.paradedb.com) - Adds Elasticsearch-quality full-text search, vector retrieval, and aggregations to PostgreSQL, with a docs MCP for agent use. *Use case: Adding full-text search to PostgreSQL, running a vector query, using the docs MCP.*
- [Pinecone](https://www.pinecone.io) - Vector database integration to create indexes, upsert data, and run semantic search via the Pinecone MCP server. *Use case: Creating an index, upserting vectors, running a semantic search or the quickstart.*
- [PlanetScale](https://planetscale.com) - An authenticated hosted MCP server that accesses your PlanetScale organizations, databases, branches, schema, and Insights data. *Use case: Listing organizations, reading a branch schema, checking Insights data.*
- [Railway](https://railway.app) - Skills and MCP for deploying, configuring, monitoring, and troubleshooting apps, databases, and networking on Railway. *Use case: Deploying a service, checking an environment, troubleshooting a database or network issue.*
- [Redis](https://redis.io) - Development best practices for data structures, the query engine, vector search, caching, and performance. *Use case: Picking a data structure, running a vector query, applying a caching or performance skill.*
- [Render](https://render.com) - Deploy, debug, and monitor applications on Render. Includes skills, rules, commands, an agent, MCP config, and hooks for the full Render workflow. *Use case: Deploying a service, debugging a failed build, using a Render hook or command.*
- [ScyllaDB](https://www.scylladb.com) - Official ScyllaDB agent skills. Bundles guided skills for ScyllaDB Cloud setup, CQL data modeling, and Vector Search; each is invoked independently by the agent when relevant. *Use case: Setting up ScyllaDB Cloud, modeling CQL, trying Vector Search from the skill pack.*
- [Sentry](https://sentry.io) - Debugging plugin with Sentry MCP and skill capabilities. *Use case: Opening a production error, using the Sentry skill, querying the MCP for a stack trace.*
- [Supabase](https://supabase.com) - Access your Supabase projects and perform tasks like managing tables, fetching config, and querying data. *Use case: Managing a table, fetching project config, querying data in a project.*
- [Temporal](https://temporal.io) - Comprehensive skill for the entire Temporal lifecycle - developing applications, using the Temporal CLI, running and managing Temporal Server, and working with Temporal Cloud. *Use case: Writing a workflow, using the Temporal CLI, checking Temporal Cloud or a local server.*
- [turbopuffer](https://turbopuffer.com) - Vector and full-text search database integration. *Use case: Writing a vector query, running full-text search, connecting the turbopuffer integration.*
- [Twilio](https://www.twilio.com) - Skills and MCP for Messaging, Voice, Verify, SendGrid, and 30+ products, including API order and what to avoid. *Use case: Sending a message, checking Verify or Voice, following the skill for the right API order.*
- [Vantage](https://www.vantage.sh) - Query cloud costs, manage cost reports, budgets, alerts, and recommendations across your Vantage workspace. *Use case: Querying cloud cost, opening a report, checking a budget or recommendation.*
- [Vercel](https://vercel.com) - Build and deploy web apps and agents. *Use case: Deploying an app, checking a build, configuring a domain or env var.*
- [WorkOS](https://workos.com) - Skills for AuthKit, SSO, Directory Sync, RBAC, Vault, Audit Logs, and migrations, plus an MCP server for the workspace. *Use case: Setting up AuthKit or SSO, checking Directory Sync, using the WorkOS MCP against a workspace.*
- [Zscaler](https://www.zscaler.com) - Manage the Zscaler cloud security platform including ZPA (private access), ZIA (internet access), ZDX (digital experience), ZCC (client connector), EASM (attack surface management), and Z-Insights (security analytics). *Use case: Auditing a ZPA policy, investigating an incident, onboarding an application across ZIA or ZDX.*

## MCP

66 plugins.

- [1Password](https://1password.com) - Developer-environment tools to create, import, and manage project secrets over MCP, plus an agent skill for secret workflows. *Use case: Looking up an item the Bot is allowed to use, checking a vault, using the 1Password MCP without pasting a secret in chat.*
- [Agent Compatibility](https://cursor.com/marketplace/cursor/agent-compatibility) **`C`** - CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. *Use case: Scanning a repo for compatibility, auditing startup, checking whether docs still match the code.*
- [Aikido](https://www.aikido.dev) - Security-scanning skills, a rule, and an MCP server for Aikido findings inside the agent. *Use case: Opening a security finding, asking for a remediations path, checking a scan result.*
- [AMD](https://www.amd.com) - Verified agent skills for routing image and audio through local AI on Ryzen AI and serving LLMs on AMD Instinct GPUs. *Use case: Using an AMD skill against a GPU or ROCm workflow, checking a platform guide, generating the recommended setup.*
- [Ashby](https://www.ashbyhq.com) **`C`** - Connect to Ashby - search candidates and jobs, prep for interviews, manage pipeline tasks, and take recruiting actions - via Ashby's official remote MCP server. *Use case: Searching candidates, prepping an interview, moving a pipeline task.*
- [AtScale](https://www.atscale.com) - Query governed business metrics, definitions and context from Cursor via AtScale MCP. *Use case: Querying a governed metric, reading a definition, pulling context into a coding task.*
- [Auth0](https://auth0.com) - A single unified Auth0 skill that detects your framework, feature, and tooling, then loads the right reference guides for adding authentication - login, MFA, Organizations, ACUL, custom domains, branding, JWT validation, migration, and debugging - to any app. *Use case: Checking an Auth0 skill, wiring a login flow, using the MCP against a tenant.*
- [Browser Use](https://browser-use.com) - Give Cursor a real browser - your Chrome or a Browser Use Cloud browser. Use it whenever a task involves a website or web app: browsing, scraping and data extraction, filling forms, testing sites, taking screenshots, automating web workflows. *Use case: Opening a site in Chrome or a cloud browser, filling a form, taking a screenshot of a failing flow.*
- [Buildkite](https://buildkite.com) - MCP server and skills for designing pipelines, troubleshooting builds, and common CI/CD agent workflows. *Use case: Checking a pipeline, reading a build, using the Buildkite MCP from the agent.*
- [Chainguard](https://www.chainguard.dev) - Secure container images and hardened library dependencies powered by Chainguard. Query images, check advisories, manage policies, and configure Chainguard Libraries for Java, JavaScript, and Python. *Use case: Looking up a hardened image, checking a supply-chain skill, applying a Chainguard recommendation.*
- [Checkmarx](https://checkmarx.com) - The Checkmarx MCP Server acts as a translation layer that connects your AI assistant to Checkmarx One APIs, enabling developers and security teams to interact with security operations directly via natural language. *Use case: Asking about a vulnerability, starting a scan, remediating a secret or IaC finding.*
- [Circleback](https://circleback.ai) **`C`** - Connect to Circleback - search meetings, transcripts, action items, calendar events, and emails, and look up people and companies - via Circleback's official remote MCP server. *Use case: Searching a meeting transcript, pulling action items, looking up a person or company from the notes.*
- [Cisco ThousandEyes](https://www.thousandeyes.com) - Connect Cursor to ThousandEyes MCP endpoints for network intelligence workflows. *Use case: Checking a network test, reading an outage signal, querying ThousandEyes from the agent.*
- [CLI for Agents](https://cursor.com/marketplace/cursor/cli-for-agent) **`C`** - Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, and dry-run. *Use case: Designing a flag, writing help with an example, adding a dry-run and an idempotent default.*
- [Cloudinary](https://cloudinary.com) - Use Cloudinary directly in Cursor. Upload, manage, optimize, and transform images and videos at scale using natural language. *Use case: Uploading an asset, transforming an image, using the Cloudinary MCP from a media workflow.*
- [CodeRabbit](https://www.coderabbit.ai) - Run CodeRabbit reviews for code, PR, security, and quality checks, plus guarded autofix for unresolved GitHub PR feedback in Cursor. *Use case: Asking for a review comment, checking a finding, using the CodeRabbit skill on a diff.*
- [Continual Learning](https://cursor.com/marketplace/cursor/continual-learning) **`C`** - Incrementally learns durable user preferences and workspace facts from transcript changes and keeps AGENTS.md up to date with plain bullet points. *Use case: Updating AGENTS.md from a transcript, keeping only high-signal bullets, refusing to dump the whole chat.*
- [Corridor](https://www.corridor.dev) - Secures AI-generated code. Start by creating an API key at https://app.corridor.dev/settings. *Use case: Using the Corridor skill on a workflow, checking the MCP, asking the agent to follow the Corridor path.*
- [Cursor SDK](https://cursor.com/marketplace/cursor/cursor-sdk) **`C`** - Build apps, scripts, CI pipelines, and automations on the Cursor TypeScript SDK, covering runtime selection, auth, streaming, MCP, and error handling. *Use case: Selecting a runtime, streaming a run, wiring MCP or auth into a script or CI job.*
- [Cursor Team Kit](https://cursor.com/marketplace/cursor/cursor-team-kit) **`C`** - Internal engineering team workflows for CI, code review, shipping, control-cli, control-ui, verify-this, test reliability, code cleanup, and work summaries. Designed to work without requiring third-party service integrations. *Use case: Running an internal CI workflow, applying a review checklist, verifying a ship step.*
- [D&B Commercial Graph](https://www.dnb.com/en-us/solutions/artificial-intelligence/context-layer.html) - Dun & Bradstreet empowers teams to execute workflows such as entity resolution, Sales & Marketing, Finance, Enterprise Master Data Management, Supply Chain, Compliance and more using relationship-aware business context from the D&B Commercial Graph™. *Use case: Looking up a company, walking a commercial-graph edge, pulling a D&B record into research.*
- [D&B Risk Analytics](https://www.dnb.com/en-us/products/dnb-supplier-intelligence.html) - Dun & Bradstreet empowers teams to execute risk workflows such as KYC/KYB, entity resolution, screening, alert triage, and more using relationship-aware business context from the D&B Commercial Graph™. *Use case: Checking a risk score, reading an analytics field, pulling a D&B risk record before a decision.*
- [Databricks](https://www.databricks.com) - Skills for the CLI, Apps, Lakebase, Model Serving, Lakeflow Jobs, Spark Declarative Pipelines, and related Databricks surfaces. *Use case: Querying a workspace, checking a notebook or job, using the Databricks MCP.*
- [Endor Labs Agent Kit](https://www.endorlabs.com) - Setup and security-workflow agents and skills for Endor Labs inside the coding agent. *Use case: Running a dependency risk check, reading an Endor finding, applying the agent-kit remediations path.*
- [eToro](https://www.etoro.com) - Rules, skills, and live API documentation for building on the eToro Public API. *Use case: Checking a market or portfolio view the MCP exposes, reading a position, asking a trading-data question.*
- [Falconer](https://falconer.com) - Read, search, and update Falconer documents from Cursor through hosted HTTP MCP. *Use case: Reading a Falconer document, searching the set, updating a doc over hosted HTTP MCP.*
- [Forge](https://www.opsera.io/platform) - Work orders, journey progress, artifacts, ForgeScore, dev activity, and project context for AI-assisted development. *Use case: Using the Opsera Forge skill, checking a forge workflow, asking the agent to follow the Forge path.*
- [GitHits](https://githits.com) - A code-context layer that feeds relevant repository context to coding agents. *Use case: Asking for code context on a file, pulling the layer a coding agent needs, checking a GitHits result.*
- [GitHub](https://github.com) **`C`** - Connect to GitHub - repositories, issues, pull requests, code search, and Actions - via GitHub's official remote MCP server. *Use case: Opening a repo, searching issues or PRs, checking an Actions run.*
- [here.now](https://here.now) - Publish websites, apps, and files to live URLs at {slug}.here.now or custom domains. Publish HTML apps, documents, images, PDFs, videos, and static files, with access control, custom domains, analytics, and private Drive storage for agent files. *Use case: Publishing an HTML app to a slug, attaching a custom domain, checking access control or analytics.*
- [HeyGen](https://www.heygen.com) - Create HeyGen avatar videos, personalized video messages, and translated / dubbed videos. Build a persistent digital identity from a photo, generate presenter-led videos with your digital twin, and localize existing videos into 175+ languages with voice cloning and lip-sync. *Use case: Starting an avatar or video job, checking a HeyGen skill, pulling a generated asset.*
- [Higgsfield](https://higgsfield.ai) - Generate images, videos, and more using Higgsfield MCP from Cursor. *Use case: Kicking off a Higgsfield generation, checking a skill, retrieving the output.*
- [Lovable](https://lovable.dev) - Drive Lovable from Cursor: create projects, send work to the Lovable agent, manage Lovable Cloud databases, and deploy, all through the Lovable MCP server. *Use case: Asking Lovable how to change a generated app, applying a skill, checking the project the plugin targets.*
- [Lucid](https://lucid.co) - Ideate, diagram, and align teams by connecting Cursor to Lucid. Search, generate, and manage your technical architecture directly from the editor. *Use case: Opening a Lucid diagram, asking the agent to read a board, using the Lucid MCP.*
- [Magic Patterns](https://www.magicpatterns.com) - Use Magic Patterns (magicpatterns.com) from Cursor: prototype ideas, generate UI inspiration, upload local UI, and integrate Magic Patterns designs into your codebase. *Use case: Generating a UI pattern, applying a Magic Patterns skill, checking a component suggestion.*
- [Mainframe](https://cursor.com/marketplace/mainframe) - Create and share short video updates from agent work. *Use case: Using the Mainframe skill on a workflow, checking the MCP, asking the agent to follow the Mainframe path.*
- [Mem0](https://mem0.ai) - Persistent memory, personalization, and semantic search via the Mem0 platform. *Use case: Storing a preference, recalling a prior fact, checking what the memory store already has.*
- [Meta Reality Labs](https://developers.meta.com/horizon) - Agent skills for Meta Quest and Horizon OS development. Helps an agent assist with Quest app debugging, performance analysis, project setup, Unity and WebXR workflows, Spatial SDK and Platform SDK integration, store submission checks, and metavr device workflows. *Use case: Debugging a Quest app, checking a Unity or WebXR workflow, running a store-submission check.*
- [Meticulous](https://www.meticulous.ai) - Agent skills for Meticulous visual regression testing - review test runs, investigate replays, debug diffs. *Use case: Reviewing a visual-regression run, opening a replay, debugging a screenshot diff.*
- [Microsoft Dataverse](https://www.microsoft.com/en-us/power-platform/products/power-apps/dataverse) - CRUD, bulk data operations, advanced queries, and schema lifecycle for Dataverse from a coding agent. *Use case: Querying a Dataverse table, checking a record, using the Dataverse MCP.*
- [Modern Web Guidance](https://goo.gle/modern-web-guidance) - Agent skill and CLI that steers web apps toward modern, secure, high-performance APIs instead of outdated workarounds. *Use case: Asking Chrome's modern-web skill a platform question, checking a guidance page, applying a recommended pattern.*
- [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) - Connect to MongoDB Atlas clusters only through the Atlas Managed MCP Server. Sign in with your Atlas account to explore data, manage collections, optimize queries, generate reliable code with MongoDB best practices, and manage Atlas resources such as clusters, projects, database users, and network. *Use case: Signing into Atlas, exploring a cluster, managing a user, IP access, or collection.*
- [Navan](https://navan.com) **`C`** - Connect to Navan - query expenses, analyze travel bookings, check policies and approvals, and manage cards - via Navan's official remote MCP server. *Use case: Querying an expense, checking a booking against policy, looking up a card or approval.*
- [Nvidia Skills](https://developer.nvidia.com) - Skills for NVIDIAs ecosystem spans GPU acceleration, CUDA, AI agents, inference, robotics, Physical AI, Omniverse, and simulation. This plugin helps you find the right skills to help in building NVIDIA-powered workflows. *Use case: Using an NVIDIA skill on a GPU workflow, checking a CUDA or NIM step, applying the recommended pattern.*
- [OneSignal](https://onesignal.com) - Connect Cursor to OneSignal through the OneSignal MCP server. *Use case: Sending a test notification, checking a message, using the OneSignal skill against an app.*
- [Orchestrate](https://cursor.com/marketplace/cursor/orchestrate) **`C`** - Fan a large task out across parallel cloud agents via the Cursor SDK: planners publish tasks, workers hand off back up, and a script reconciles the tree from disk and git. *Use case: Fanning a large task across cloud workers, reading a planner handoff, checking a verifier result.*
- [Port](https://www.port.io) - MCP server that gives the agent engineering context from the Port system of record for services, teams, and related entities. *Use case: Querying a software catalog, checking a service, using the Port MCP.*
- [pstack](https://cursor.com/marketplace/cursor/pstack) **`C`** - Agent workflows for writing less, higher-quality code that can be parallelized with a deep-first review pass. *Use case: Running a deep-first review before speeding up, parallelizing a workflow, asking pstack to raise the quality bar.*
- [QuiverAI](https://quiver.ai) - Create, refine, and vectorize SVG assets with the hosted QuiverAI MCP server. *Use case: Using a QuiverAI skill, checking the MCP, asking the agent to follow the Quiver path.*
- [Raisely](https://www.raisely.com) - Connect Cursor to Raisely. Ships the Raisely MCP server so you can query and manage campaigns, donations, supporters, and more from chat. *Use case: Checking a campaign, using the Raisely skill, querying a fundraising record the MCP exposes.*
- [React Doctor](https://react.doctor) - Scan, understand, and fix React codebase diagnostics with React Doctor. *Use case: Asking why a React tree is slow, applying a doctor finding, checking a recommended fix.*
- [Remotion](https://www.remotion.dev) - Video-creation skills covering animations, audio, captions, 3D, and programmatic React video. *Use case: Building a programmatic video, adding captions or audio, applying a Remotion animation skill.*
- [resolve-ai](https://resolve.ai) - Use Resolve for investigations, incidents, and production context. *Use case: Opening a Resolve finding, asking the agent to follow the Resolve skill, checking a result.*
- [resolve-ai-admin](https://resolve.ai/product/overview) - Administrator skills for managing Resolve integrations: create, debug, and configure satellite-backed sources. *Use case: Using the admin Resolve skill, checking a workspace setting, applying an admin-only action.*
- [Revyl](https://www.revyl.com) - One-install mobile dev loops on cloud iOS/Android devices - run the current app, verify changes with screenshots, and ship with device-backed evidence. *Use case: Running a Revyl check, reading a finding, applying the skill to a failing flow.*
- [Roboflow](https://roboflow.com) - Computer-vision skills and MCP tools for datasets, annotation, training, workflows, inference, and deployment. *Use case: Searching a vision model, running inference, managing a dataset.*
- [Scandit](https://www.scandit.com) - AI agent skills for integrating the Scandit Data Capture SDK - product selection, documentation, and implementation guides for barcode scanning, ID capture, and smart label capture. *Use case: Using a Scandit scanning skill, checking a capture workflow, applying the recommended SDK path.*
- [Semgrep](https://semgrep.dev) - Plugin by Semgrep. Provides security scanning via MCP, hooks, and skills for Cursor. *Use case: Running a Semgrep rule, reading a finding, applying a suggested fix.*
- [Sinch](https://www.sinch.com) - Ship faster with Sinch in Cursor - SMS, WhatsApp, RCS, voice, email, verification, numbers, and more, all with the help of Skills and Sinch MCP. *Use case: Sending a message, checking a Sinch API, using the skill for the right product.*
- [Snyk](https://snyk.io) - Security scanning, remediation, and dependency health. *Use case: Opening a Snyk finding, applying a secure-development skill, checking a scan.*
- [Snyk API & Web](https://snyk.io/product/dast-api-web/) - Onboard scan targets, configure authentication, run DAST scans, and triage findings through the Snyk API and Web MCP server. *Use case: Checking an API or web scan, reading a Snyk finding, applying the matching remediations skill.*
- [SonarQube](https://www.sonarsource.com/products/sonarqube) - Automatically enforce SonarQube code quality and security in the agent coding loop - 7,000+ rules, secrets scanning, agentic analysis, and quality gates across 40+ languages. *Use case: Opening a Sonar finding, checking a quality gate, using the SonarSource skill.*
- [Sonatype](https://www.sonatype.com) - AI-powered dependency intelligence. Check vulnerabilities, find safer versions, and make better dependency decisions using Sonatype's component data. *Use case: Checking a dependency, reading a Sonatype finding, applying the supply-chain skill.*
- [Subtext](https://www.fullstory.com) - Drive a hosted browser, capture before/after proof, and leave reviewer-facing evidence against your running app. *Use case: Driving a hosted browser, capturing before-and-after proof, leaving reviewer evidence against a running app.*
- [Tavily](https://tavily.com) - Web search, content extraction, crawling, deep research, and URL discovery powered by tvly CLI. *Use case: Searching the web, extracting a page, grounding an answer with a Tavily result.*
- [Thermos](https://cursor.com/marketplace/cursor/thermos) **`C`** - Thermo-nuclear branch review: deep correctness and security audits plus harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional take-the-wheel and FSD merge-ready flows. *Use case: Running a thermo-nuclear branch review, applying a harsh rubric, optionally preparing a merge-ready PR.*

## Payments

14 plugins.

- [1inch](https://1inch.io) - Quote and execute intent-based (Fusion) and cross-chain token swaps, build and manage limit orders via the Orderbook API, and call any 1inch product endpoint - portfolio balances, spot prices, token metadata, gas estimates, and more. Also includes documentation search and SDK code examples. *Use case: Quoting a Fusion swap, building a limit order, calling a 1inch portfolio or price endpoint.*
- [Airwallex](https://www.airwallex.com) - A CLI for Airwallex payments and payouts from the agent. *Use case: Using the Airwallex CLI, checking a payment or payout, applying the Airwallex skill.*
- [Chargebee](https://www.chargebee.com) - Use Chargebee's API integration patterns, webhook handling, SDK usage, and schema references for billing operations in Cursor. *Use case: Looking up a billing API pattern, handling a webhook, checking an SDK or schema reference.*
- [Circle](https://www.circle.com) - Ship stablecoin apps faster. Best-practice skills for USDC payments, cross-chain transfers, wallets, and smart contracts - plus Circle's MCP server for real-time SDK and documentation guidance. *Use case: Building a USDC payment flow, doing a cross-chain transfer, asking the Circle MCP for SDK guidance.*
- [Kraken](https://www.kraken.com) - Agent-first CLI for trading crypto, stocks, forex, and derivatives on Kraken. Paper trading by default; live trading opt-in via API keys. *Use case: Paper-trading a pair, checking market data, flipping to live only after keys are set.*
- [Phantom](https://phantom.com) - Give your agent a wallet. Swap, sign, and manage addresses across Phantom's supported chains - and tap into Phantom's docs for context. *Use case: Checking a wallet address, preparing a swap, reading Phantom docs for a supported chain.*
- [Ramp](https://ramp.com) - Connect Cursor to Ramp via MCP and drive spend analysis, approvals, transaction cleanup, and vendor workflows. *Use case: Analyzing spend, checking an approval, cleaning up a transaction or vendor.*
- [RevenueCat](https://www.revenuecat.com) - Configure your RevenueCat integration and access data from your RevenueCat projects. *Use case: Configuring a project, reading subscription data, checking a RevenueCat integration.*
- [RevenueCat Play Billing](https://www.revenuecat.com/docs/getting-started/installation/android) - Deep Google Play subscription lifecycle skills for the RevenueCat Android SDK - purchases, plan and price changes, payment recovery, webhooks, security. *Use case: Handling a Play purchase, changing a plan or price, checking a webhook or recovery path.*
- [Revolut X](https://www.revolut.com/revolut-x/) - Use the Revolut X CLI (revx) for crypto trading, market data, monitoring, and grid bot strategies. *Use case: Using revx for market data, checking a grid-bot strategy, monitoring a crypto pair.*
- [Shopify](https://www.shopify.com) - Developer tools to search Shopify docs and generate or validate GraphQL, Liquid, and UI extension code. *Use case: Searching Shopify docs, generating GraphQL or Liquid, validating a UI extension.*
- [Stripe](https://stripe.com) - Integration help covering best practices, API and SDK upgrade guidance, and the Stripe MCP server. *Use case: Following a Stripe integration skill, checking an API or SDK upgrade, using the Stripe MCP.*
- [Stripe Link](https://stripe.com/payments/link) - Get secure, one-time-use payment credentials from a Link wallet so agents can complete purchases on your behalf. *Use case: Requesting a one-time payment credential, completing a purchase the Bot is allowed to make, avoiding a stored card in chat.*
- [Whop](https://whop.com) - Build and run your business end-to-end with Whop. Launch your website, accept payments, run ads, and more - directly in Cursor. *Use case: Launching a site, checking a payment, running an ad or other Whop business action.*

## Productivity

33 plugins.

- [Adobe Developer App Builder](https://developer.adobe.com/app-builder/) - Development, customization, testing, and deployment skills for Adobe App Builder projects. Covers project initialization, action scaffolding, React Spectrum UI scaffolding, Jest unit and integration testing, Playwright E2E testing, and GitHub Actions / Azure DevOps / GitLab CI deployment pipelines. *Use case: Scaffolding an action, building a React Spectrum UI, running Jest or a CI deploy.*
- [AgentMail](https://www.agentmail.to) - AI-native email infrastructure for coding agents. Create inboxes, send and receive emails, manage threads, and automate email workflows. *Use case: Creating an inbox, sending or receiving a message, managing a thread.*
- [Airtable](https://www.airtable.com) - Database and operations layer that combines structured data with shared visual surfaces, plus the official Airtable MCP server. *Use case: Reading a base schema, creating a record, using the official Airtable MCP on a shared view.*
- [Asana](https://asana.com) - Connect Cursor to Asana. Create tasks, update projects, search your workspace, and manage work - directly from the editor. *Use case: Creating a task, searching a workspace, updating a project.*
- [Atlassian](https://www.atlassian.com) - MCP and skills for Jira, Confluence, triage, backlogs, status reports, and related Atlassian work. *Use case: Opening a Jira issue, writing a Confluence page, running a backlog or status-report skill.*
- [Atlassian Forge](https://developer.atlassian.com/platform/forge/) - Forge app builder skill bundle with Forge MCP integration for building, deploying, and troubleshooting Atlassian Forge apps. *Use case: Building a Forge app, deploying it, troubleshooting with the Forge MCP.*
- [Atlassian Teamwork Graph](https://www.atlassian.com/platform/teamwork-graph) - Agent-first interface to Jira issues, Confluence pages, Bitbucket PRs, and connected third-party sources via Atlassian's context graph. *Use case: Drafting a Jira issue from a PR, linking it to an epic, running /twg-setup after install.*
- [Box](https://www.box.com) - Search, read, and manage Box content, build platform integrations, and use Box AI for Q&A, summarization, and extraction. *Use case: Searching Box, reading a file, asking Box AI to summarize or extract.*
- [Canva](https://www.canva.com) - Create, edit, review, resize, and brand-check Canva designs with the Canva MCP server. *Use case: Creating a design, resizing it, running a brand check over the Canva MCP.*
- [ChatPRD](https://www.chatprd.ai) - Product requirements in your editor. Write PRDs from code context, implement from specs, and verify your changes match requirements - powered by ChatPRD's MCP. *Use case: Writing a PRD from code context, implementing against a spec, checking whether a change matches the requirement.*
- [ClickUp](https://clickup.com) - Connect Cursor to your ClickUp workspace - manage tasks, track time, and collaborate without switching context. *Use case: Creating a task, tracking time, searching a ClickUp workspace.*
- [GitBook](https://www.gitbook.com) - Create, configure, and author GitBook documentation sites - site orchestration via the GitBook REST API, Git Sync setup, branding customization, and GitBook-flavored Markdown page authoring. *Use case: Authoring a GitBook page, setting up Git Sync, applying branding or GitBook-flavored Markdown.*
- [GitLab](https://about.gitlab.com) - Connect Cursor to GitLab with the GitLab MCP server. Plan, track, and manage issues, merge requests, and pipelines from your editor. *Use case: Opening an issue, checking a merge request, reading a pipeline from the GitLab MCP.*
- [Glean](https://www.glean.com) - Official Glean plugin for Cursor - search documents, Slack, and email; explore code across repos; and find experts and stakeholders. *Use case: Searching documents, Slack, or email, exploring code across repos, finding an expert.*
- [GSAP](https://gsap.com) - Official GSAP skills for Cursor, Claude and other AI agents - core animations, timelines, ScrollTrigger, plugins, utilities, React integration, and performance best practices. *Use case: Writing a timeline, adding ScrollTrigger, applying a React or performance skill.*
- [Harness](https://www.harness.io) - Packaged Harness skills and MCP server to build, debug, deploy, and govern from the agent. *Use case: Building or deploying via Harness, debugging a pipeline, using the Harness MCP.*
- [IcePanel](https://icepanel.io) - Cursor Plugin for IcePanel - enables AI assistants to manage models, connections, and more across your IcePanel landscape. *Use case: Updating a landscape model, adding a connection, asking IcePanel about a system.*
- [LaunchDarkly](https://launchdarkly.com) - Agent skills and MCP server for feature-flag management, AI configuration, and skill authoring. *Use case: Managing a flag, checking an AI configuration, using the LaunchDarkly MCP.*
- [Linear](https://linear.app) - Cursor Plugin for Linear - enables AI assistants to manage issues, projects, documents, and more across your Linear workspace. *Use case: Creating an issue, updating a project, reading a Linear document.*
- [MagicPath](https://www.magicpath.ai) - Give Cursor a multiplayer canvas for your code with MagicPath. Bring existing UI into the canvas, create component libraries, apply design-system themes, and ship components back into production code. *Use case: Bringing UI onto the canvas, applying a design-system theme, shipping a component back into code.*
- [Mintlify](https://mintlify.com) - Comprehensive reference for building Mintlify documentation sites. *Use case: Looking up a Mintlify site pattern, checking a docs reference, applying an authoring skill.*
- [Miro](https://miro.com) - Secure access to Miro boards. Enables AI to read board context, create diagrams, and generate code with enterprise-grade security. *Use case: Reading a board, creating a diagram, generating code from board context.*
- [Monday.com](https://monday.com) - Seven skills for monday CRM users - first-run setup, morning briefings, forecast dashboards, board diagnosis, bulk data hygiene, workspace setup, and meeting-to-opportunity sync. Each skill publishes a monday artifact (update, doc, or dashboard) so work stays inside monday. *Use case: Running a morning briefing, diagnosing a board, turning a meeting into an opportunity.*
- [Paper](https://paper.design) - Design on a canvas that Cursor can read and write to - built on web standards. *Use case: Reading a canvas the Bot can write to, updating a design on web standards, checking what Paper already has.*
- [Playwright](https://playwright.dev) **`C`** - Drive a real browser for agents - navigate pages, click and fill elements, take snapshots and screenshots, and run end-to-end checks - via Microsoft's Playwright MCP server. *Use case: Navigating a page, clicking and filling a form, taking a snapshot or running an e2e check.*
- [Resend](https://resend.com) - Skills and MCP server for the Resend email platform - sending, receiving, templates, CLI, React Email, and deliverability best practices. *Use case: Sending an email, checking a template, using React Email or a deliverability skill.*
- [Sanity](https://www.sanity.io) - MCP server, agent skills, rules, and commands for Sanity content work. *Use case: Querying content, applying a Sanity skill, using the MCP against a studio.*
- [Svelte](https://svelte.dev) - A plugin for all things related to Svelte development, MCP, skills, and more. *Use case: Asking a Svelte skill, using the Svelte MCP, applying a Svelte-specific pattern.*
- [TierZero](https://www.tierzero.ai) - Agentic production engineering for SWE, SRE and DevOps. Resolve and investigate issues against existing observability, CI/CD, and self-improving knowledge bases. *Use case: Investigating a production issue, using existing observability, writing back to the knowledge base.*
- [tldraw](https://www.tldraw.com) - Draw and visually collaborate with your agents inside Cursor. *Use case: Drawing on a shared canvas, collaborating with the agent, leaving a visual note in the editor.*
- [Webflow](https://webflow.com) - Production-ready agent skills for Webflow - CMS management, site auditing, asset optimization, and safe publishing. *Use case: Managing CMS items, auditing a site, optimizing an asset before publish.*
- [Wix](https://www.wix.com) - Build, manage, and deploy Wix sites and apps directly from Cursor. Includes CLI development skills for creating dashboard extensions, backend APIs, site widgets, and service plugins. Connects to the Wix MCP server for site management. *Use case: Building a dashboard extension, calling a backend API, managing a site over the Wix MCP.*
- [Zapier](https://zapier.com) - Connect 9,000+ apps to your AI workflow. Discover, enable, and execute Zapier actions directly from your client. *Use case: Discovering an action, enabling it, executing a Zapier step from the client.*

## Sales

6 plugins.

- [Apollo.io](https://www.apollo.io) - Prospect, enrich leads, load outreach sequences, and query sales analytics with Apollo.io - one-click MCP server integration. *Use case: Searching prospects, enriching a contact or company, adding to a list or sequence.*
- [Clay](https://www.clay.com) **`C`** - Connect to Clay - find and enrich people and companies across 150+ data providers, run AI research agents, and trigger your team's approved Clay workflows - via Clay's official hosted MCP server. *Use case: Finding a person across providers, running a research agent, triggering an approved Clay workflow.*
- [Gong](https://www.gong.io) **`C`** - Revenue-intelligence MCP for account summaries, deal insights, and call briefs. *Use case: Pulling an account summary, reading deal insight, opening a call brief.*
- [HubSpot](https://www.hubspot.com) **`C`** - Connect to HubSpot CRM - search and update contacts, companies, deals, and tickets; work with activities, conversations, and marketing emails - via HubSpot's official remote MCP server. *Use case: Searching a contact, updating a deal, working a ticket or marketing email.*
- [Salesforce](https://www.salesforce.com) **`C`** - Connect to Salesforce via Salesforce Hosted MCP - query, search, create, update, and traverse records in your org. *Use case: Querying a record, creating or updating an object, traversing related records in the org.*
- [ZoomInfo](https://www.zoominfo.com) - Connect AI agents to ZoomInfo's verified GTM context graph: 100M companies, 300M professional contacts, buyer intent signals, and real-time scoops. Build prospect lists, enrich records, deep research key organizations, find decision-makers, and prioritize accounts by intent. *Use case: Building a prospect list, enriching a record, prioritizing an account by intent.*

## Scheduling

1 plugin.

- [Zoom](https://www.zoom.com) **`C`** - Search meetings and recordings, pull summaries and transcripts, and work with Zoom Docs. *Use case: Searching meetings, pulling a recording summary or transcript, opening a Zoom Doc.*

## Held for Verification

Every listed link is the vendor's public product page when one exists. Cursor Marketplace URLs appear only when there is no public company or product site. Entries that appear in the Grok Bot in-app catalog but have no confirmed URL are listed here without a link rather than with a guessed one.

None this capture. Every listed plugin has a verified Cursor Marketplace URL from the Grok Bot in-app catalog plus the public marketplace listing.

## Related

- [awesome-grok-connectors](https://github.com/rdmgator12/awesome-grok-connectors) - Grok.com chat connectors and skills, a different xAI surface.
- [awesome-claude-connectors](https://github.com/rdmgator12/awesome-claude-connectors) - Companion list for Anthropic's Claude Connectors catalog.
- [awesome-claude-plugins](https://github.com/rdmgator12/awesome-claude-plugins) - Companion list for Claude Code and Cowork plugins.
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) - Model Context Protocol servers powering many of the plugins above.
- Cursor Marketplace - Official install surface this list tracks (linked in the introduction).
- [Grok Bot docs](https://docs.x.ai/grok-bot/overview) - xAI product documentation.

---

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

To the extent possible under law, [Ralph Martello](https://github.com/rdmgator12) has waived all copyright and related or neighboring rights to this work.
