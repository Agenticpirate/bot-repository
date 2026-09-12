# Marketing Agent Open Repo Roadmap

This document defines what the repository still needs to become a high-conviction, high-conversion open-source repo for marketing agents — not just an agent directory.

## Target positioning

Current repo positioning:

> Open-source starter kit for building searchable AI agent marketplaces and reusable agent squads.

Recommended sharper marketing positioning:

> The open-source Marketing Agent OS: reusable agent profiles, squad recipes, workflow templates, evaluation rubrics, and demo data for building an AI marketing team.

The repo should win by showing how to compose agents into working marketing squads, not by listing generic agent cards.

## Competitive readout

A quick GitHub search shows three relevant patterns:

1. **Awesome lists** get stars because they are easy to browse and submit to.
   - Example pattern: large curated AI-agent lists.
   - Implication: add a curated `awesome-marketing-agents` style index and contribution path.

2. **Agent marketplace repos** exist, but many are thin directories or hackathon marketplaces.
   - Implication: differentiation should be operational depth: schemas, squads, workflow templates, validation, and demo UI.

3. **Marketing agent repos** are currently sparse and low-star.
   - Many describe generic marketing automation with limited public assets.
   - Implication: there is room to become the reference repo if we provide a complete marketing-agent operating model.

## What is already strong

The repo already has a clean public-safe foundation:

- `README.md`
- `SETUP.md`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- public JSON schemas
- fictionalized sample data
- example agents and squads
- lightweight static demo UI
- validation and sensitivity sweep scripts

This is enough to look like a real open-source starter kit. It is not yet enough to feel like the best marketing-agent repo.

## Highest-leverage additions

### 1. Marketing-agent category map

Add a public taxonomy that makes the repo instantly understandable to marketers and builders.

Recommended file:

```txt
docs/marketing-agent-taxonomy.md
```

Recommended categories:

- Strategy: CMO, growth strategist, brand strategist, positioning strategist
- Research: market researcher, competitor analyst, customer research analyst, social listening analyst
- Acquisition: SEO strategist, paid ads strategist, media buyer, landing page CRO specialist
- Content: content strategist, blog writer, LinkedIn writer, short-video scriptwriter, newsletter writer
- Lifecycle: email marketer, onboarding strategist, retention specialist, referral designer
- Commerce: ecommerce strategist, product listing optimizer, marketplace ads specialist
- Analytics: GA4 analyst, attribution analyst, dashboard builder, experiment analyst
- Operations: campaign PM, marketing ops, automation architect, CRM manager

Why it matters: this turns the repo from generic AI-agent infrastructure into a recognizable marketing team map.

### 2. Squad recipes by business outcome

The repo needs ready-made squads organized by jobs-to-be-done, not just roles.

Recommended folder:

```txt
recipes/marketing-squads/
```

Must-have recipes:

1. `saas-launch-squad.json`
   - product marketer
   - positioning strategist
   - landing page CRO
   - content strategist
   - email lifecycle marketer
   - analytics specialist

2. `ecommerce-growth-squad.json`
   - ecommerce strategist
   - product listing optimizer
   - paid ads strategist
   - UGC creative director
   - email / SMS retention marketer
   - ROAS analyst

3. `local-service-lead-gen-squad.json`
   - local SEO specialist
   - Google Ads specialist
   - landing page CRO
   - review manager
   - CRM follow-up specialist

4. `b2b-abm-squad.json`
   - ICP analyst
   - account researcher
   - cold email writer
   - LinkedIn outreach specialist
   - sales enablement writer
   - pipeline analyst

5. `creator-growth-squad.json`
   - content strategist
   - short-video scriptwriter
   - YouTube / TikTok strategist
   - newsletter writer
   - community manager
   - analytics reporter

Why it matters: people star repos that solve a concrete workflow immediately.

### 3. Workflow templates with inputs and outputs

Each squad should include reusable workflow files that show how agents collaborate.

Recommended folder:

```txt
workflows/
  launch/
  content-engine/
  paid-ads/
  seo/
  email-lifecycle/
  social-listening/
```

Each workflow should include:

- `brief.template.md`
- `input.schema.json`
- `output.schema.json`
- `handoff.md`
- `quality-rubric.md`
- `example-output.md`

Priority workflows:

1. Positioning brief → landing page → ads → email sequence
2. Customer research → ICP → content calendar
3. Competitor teardown → differentiation matrix → campaign hooks
4. Social listening → insight report → content angles
5. Product page audit → CRO recommendations → experiment plan
6. Paid ads brief → creative variations → performance review

Why it matters: this makes the repo useful to operators, not just developers.

### 4. Public sample marketing datasets

The current sample data should be expanded with realistic but fictional marketing cases.

Recommended folder:

```txt
examples/marketing-cases/
```

Add 5 public-safe case packs:

1. B2B SaaS launch
2. DTC skincare brand growth sprint
3. Local dental clinic lead generation
4. Online course creator funnel
5. Ecommerce marketplace listing optimization

Each case pack should include:

- company snapshot
- target audience
- offer
- channel constraints
- sample customer quotes
- competitor notes
- agent squad selected
- expected deliverables

Why it matters: examples are what make the repo feel alive and immediately forkable.

### 5. Agent quality and evaluation system

Marketing users will trust the repo more if agents are evaluated against visible criteria.

Recommended files:

```txt
docs/agent-quality-rubric.md
evals/marketing-agent-evals.json
evals/sample-results.md
```

Rubric dimensions:

- strategic clarity
- audience specificity
- channel fit
- evidence quality
- output usefulness
- brand voice control
- compliance / risk awareness
- handoff quality

Why it matters: most agent repos claim capability; this repo should show how to judge capability.

### 6. Marketing-specific schema fields

Add optional marketing fields to `schema/agent.schema.json`.

Recommended additions:

```json
{
  "channelExpertise": ["SEO", "Meta Ads", "LinkedIn", "Email", "TikTok", "GA4"],
  "funnelStage": ["awareness", "consideration", "conversion", "retention", "referral"],
  "deliverables": ["landing page", "ad copy", "content calendar", "dashboard"],
  "tools": ["GA4", "HubSpot", "Google Ads", "Klaviyo", "Shopify"],
  "qualityRubrics": ["brand_voice", "conversion", "channel_fit"],
  "riskFlags": ["regulated_industry", "claims_review", "privacy"]
}
```

Why it matters: this creates a real marketing-agent data model rather than a generic agent card.

### 7. Demo UI upgrades

The UI should sell the idea in under 10 seconds.

Recommended demo additions:

- filter by funnel stage
- filter by channel
- filter by deliverable
- squad builder: select business goal → recommended squad
- one-click copy of squad JSON
- example workflow preview
- visible quality rubric score

Suggested homepage sections:

1. `Find agents by marketing outcome`
2. `Compose a squad`
3. `Run a workflow`
4. `Evaluate outputs`
5. `Contribute a new agent`

Why it matters: the current UI proves the schema; the next UI should sell the product story.

### 8. Contribution engine

To grow as open source, contributors need an easy path.

Recommended files:

```txt
.github/ISSUE_TEMPLATE/new-agent.yml
.github/ISSUE_TEMPLATE/new-squad.yml
.github/PULL_REQUEST_TEMPLATE.md
CONTRIBUTING.md  # expand existing
```

Contribution types:

- submit an agent profile
- submit a squad recipe
- submit a workflow template
- submit an eval case
- improve taxonomy

Validation should run on pull request:

```txt
npm run validate
npm run sweep
```

Why it matters: a marketplace repo needs community contribution mechanics.

### 9. Launch assets

To make the repo marketable, add launch-ready assets.

Recommended folder:

```txt
launch/
```

Files:

- `product-hunt-copy.md`
- `hacker-news-post.md`
- `linkedin-launch-post.md`
- `x-thread.md`
- `repo-social-preview.png` or design brief
- `demo-gif-script.md`

Why it matters: GitHub discoverability is weak without external launch packaging.

### 10. Clear monetization / ecosystem path

Even as open source, the repo should hint at why it matters commercially.

Recommended file:

```txt
docs/ecosystem-and-commercial-model.md
```

Public-safe angles:

- open schema for marketing agents
- managed marketplace later
- hosted demo / hosted directory later
- premium verified squads later
- agency / consultant templates later
- integration packs later

Avoid private SoWork commercial terms or internal customer references.

## Recommended repo structure after upgrade

```txt
.github/
  ISSUE_TEMPLATE/
  workflows/
app/web/
data/
docs/
  marketing-agent-taxonomy.md
  agent-quality-rubric.md
  ecosystem-and-commercial-model.md
evals/
examples/
  marketing-cases/
recipes/
  marketing-squads/
schema/
templates/
workflows/
launch/
scripts/
```

## Priority roadmap

### Phase 1 — Make the repo clearly about marketing agents

- Add `docs/marketing-agent-taxonomy.md`
- Add 20 marketing-specific sample agents
- Add 5 squad recipes
- Add README section: `Marketing Agent OS`
- Add marketing-specific keywords/topics

### Phase 2 — Make it useful

- Add 6 workflow templates
- Add 5 fictional marketing case packs
- Add quality rubrics
- Extend schema for marketing fields
- Add copyable outputs and templates

### Phase 3 — Make it credible

- Add eval cases and sample results
- Add CI validation for schemas and sensitivity sweep
- Add contribution templates
- Add demo UI filters and squad builder

### Phase 4 — Make it launchable

- Add launch copy assets
- Add social preview image
- Add Product Hunt / HN / LinkedIn launch plan
- Add clear roadmap and `good first issue` list

## Minimum viable upgrade package

If we only do one strong pass, prioritize these 10 files:

1. `docs/marketing-agent-taxonomy.md`
2. `docs/agent-quality-rubric.md`
3. `docs/ecosystem-and-commercial-model.md`
4. `recipes/marketing-squads/saas-launch-squad.json`
5. `recipes/marketing-squads/ecommerce-growth-squad.json`
6. `recipes/marketing-squads/b2b-abm-squad.json`
7. `workflows/positioning-to-campaign/brief.template.md`
8. `workflows/content-engine/brief.template.md`
9. `examples/marketing-cases/b2b-saas-launch/README.md`
10. `.github/ISSUE_TEMPLATE/new-agent.yml`

## Suggested README headline rewrite

Current:

> An open-source starter kit for building searchable AI agent marketplaces.

Recommended:

> Build your own AI marketing team marketplace — with reusable agent profiles, squad recipes, workflow templates, and evaluation rubrics.

Supporting copy:

> Open Agent Marketplace gives builders a public-safe schema and demo for composing marketing agents into working squads: launch teams, SEO teams, ecommerce growth teams, ABM teams, content engines, and lifecycle teams.

## What not to add

Do not add:

- raw internal MOS DB exports
- real customer names
- private prompts
- private workspace data
- actual internal performance metrics
- credentials, tokens, cookies, or operational URLs
- unverified claims like "best" or "largest" without public evidence

## Success criteria

The repo becomes compelling when a visitor can answer these in under one minute:

1. What is this? A starter kit for AI marketing-agent marketplaces.
2. Who is it for? Builders, agencies, marketers, and AI product teams.
3. What can I copy today? Agent profiles, squad recipes, workflows, schemas, rubrics.
4. Why should I star it? It saves weeks of work designing a marketing-agent system.
5. How can I contribute? Submit agents, squads, workflows, and eval cases through templates.
