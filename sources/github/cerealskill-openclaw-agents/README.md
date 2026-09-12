# 🤖 PickUp! an Agent

> A curated marketplace of production-ready OpenClaw agent bundles and multi-agent workflows — available in English and Spanish.

Unlike other agent repos that only ship a `SOUL.md`, every agent here includes a **complete workspace bundle** — ready to drop into OpenClaw and start working immediately. Plus, a growing library of **orchestration workflows** for multi-agent collaboration.

**[→ Browse the catalog](https://craw-agents.vercel.app/)**

---

## What's inside each agent

```
agents/<lang>/<category>/<subcategory>/<slug>/
  SOUL.md        ← personality, behavior, vibe
  IDENTITY.md    ← name, emoji, avatar
  USER.md        ← template for the human's info
  AGENTS.md      ← operational rules
  HEARTBEAT.md   ← periodic check config
  TOOLS.md       ← tool-specific notes
  BOOTSTRAP.md   ← onboarding flow on first install
  meta.yaml      ← marketplace metadata
```

Agents are organized by language (`EN`/`ES`), then by category and subcategory.

## What's inside each workflow

```
workflow/<lang>/<slug>/
  ORCHESTRATION.md   ← diagram, roles, rules, evidence, closure (EN)
  ORQUESTACION.md    ← same structure in Spanish (ES)
```

Workflows define multi-agent collaboration patterns — how agents coordinate, vote, escalate, and hand off work.

---

## Install

### One-liner (recommended)

```bash
# Install an agent (English)
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh | bash -s agent <slug> EN

# Install an agent (Spanish)
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh | bash -s agent <slug> ES

# Install a workflow (prompts you to select an agent workspace)
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh | bash -s workflow <slug> EN
```

**Parameters:**
1. `agent` or `workflow` — what to install
2. `<slug>` — the agent or workflow name (e.g. `pedro-sre`, `incident-mode`)
3. `EN` or `ES` — language (defaults to `EN`)

For agents, the script downloads all bundle files into `~/.openclaw/workspace-<slug>` and registers the workspace with `openclaw agents add`.  
For workflows, the script lists your installed agent workspaces and lets you pick where to copy the orchestration file.

### Manual

```bash
cp -r agents/EN/tech/sre/pedro-sre/* ~/.openclaw/workspace-pedro-sre/
```

---

## Agent Catalog

**146 agents** available in English and Spanish across 17 categories.

### 💼 Business

| Agent | Slug | Description |
|-------|------|-------------|
| Customer Success Manager | `customer-success-manager` | Onboarding, retention, and account health. |
| Accountant | `accountant` | Bookkeeping, reconciliations, cash flow, and financial reporting. |
| People Ops | `people-ops` | Hiring, onboarding, and team operations. |
| Legal Advisor | `legal-advisor` | General guidance and risk spotting (not legal counsel). |
| Business Ops | `business-ops` | Process design, KPIs, and execution. |
| Partnerships Manager | `partnerships-manager` | Strategic alliances and co-marketing initiatives. |
| Procurement Analyst | `procurement-analyst` | Vendor evaluation, sourcing, and cost control. |
| Product Owner | `product-owner` | Backlog clarity, discovery, prioritization, and stakeholder alignment. |
| RevOps Analyst | `revops-analyst` | Revenue systems, process alignment, and reporting. |
| Account Executive | `account-exec` | Discovery, pipeline progression, and closing. |
| Pipeline | `pipeline` | Full-cycle pipeline management, lead scoring, and deal analysis. |

### 🎨 Creative

| Agent | Slug | Description |
|-------|------|-------------|
| Podcast Producer | `podcast-producer` | Show structure, scripts, and audio production. |
| Echo | `echo` | Blog posts, social copy, newsletters, and landing pages. |
| Visual Designer | `visual-designer` | Brand systems, layouts, and visual consistency. |
| Screenwriter | `screenwriter` | Film and series — structure, character arcs, and cinematic dialogue. |
| Illustrator | `illustrator` | Visual storytelling and brand illustration systems. |
| Video Producer | `video-producer` | Scripts, shot lists, and post-production planning. |

### ⚙️ DevOps

| Agent | Slug | Description |
|-------|------|-------------|
| Pedro SRE | `pedro-sre` | Multi-cloud SRE (GCP, AWS, Azure). Kubernetes, Terraform, observability. |

### 🎓 Education

| Agent | Slug | Description |
|-------|------|-------------|
| Academic Advisor | `academic-advisor` | Course planning, academic progress, and student guidance. |
| Teacher | `teacher` | Lesson planning, classroom support, and student learning. |
| Research Assistant | `research-assistant` | Literature review, data collection, and summaries. |

### 📊 Finance

| Agent | Slug | Description |
|-------|------|-------------|
| FP&A Analyst | `fpna-analyst` | Budgeting, forecasting, and performance analysis. |

### 🏛️ Government

| Agent | Slug | Description |
|-------|------|-------------|
| Policy Analyst | `policy-analyst` | Policy research, impact analysis, and briefs. |

### 🏥 Health

| Agent | Slug | Description |
|-------|------|-------------|
| Clinical Nutritionist | `clinical-nutritionist` | Evidence-based nutrition guidance and plans. |
| Pharmacy Assistant | `pharmacy-assistant` | Medication guidance and safety reminders (non-prescriptive). |
| Physio Assistant | `physio-assistant` | Rehab guidance, mobility, and safe exercise routines. |

### 🏨 Hospitality

| Agent | Slug | Description |
|-------|------|-------------|
| Chef Consultant | `chef-consultant` | Menu design, kitchen ops, and cost control. |
| Hotel Manager | `hotel-manager` | Operations, guest experience, and staffing. |

### ⚖️ Legal

| Agent | Slug | Description |
|-------|------|-------------|
| Privacy Officer | `privacy-officer` | Privacy frameworks, compliance checklists, and risk spotting. |
| IP Specialist | `ip-specialist` | Intellectual property basics, filings, and risk checks. |

### 🚚 Logistics

| Agent | Slug | Description |
|-------|------|-------------|
| Supply Chain Analyst | `supply-chain-analyst` | Inventory, demand planning, and logistics efficiency. |

### 🏭 Manufacturing

| Agent | Slug | Description |
|-------|------|-------------|
| Operations Supervisor | `operations-supervisor` | Plant execution, safety, and throughput. |
| Quality Manager | `quality-manager` | QA systems, audits, and continuous improvement. |

### 📣 Marketing

| Agent | Slug | Description |
|-------|------|-------------|
| Brand Manager | `brand-manager` | Brand identity, voice, and consistency. |
| Community Manager | `community-manager` | Engagement, moderation, and community growth. |
| Content Strategist | `content-strategist` | Content systems, pillars, and distribution. |
| Marketing Lead | `marketing-lead` | Positioning, go-to-market, and growth strategy. |
| Lifecycle Marketer | `lifecycle-marketer` | Activation, retention, and lifecycle journeys. |
| Performance Marketer | `performance-marketer` | Paid channels, ROAS, and optimization. |
| SEO Specialist | `seo-specialist` | Technical SEO, content optimization, and growth. |

### 🤝 Nonprofit

| Agent | Slug | Description |
|-------|------|-------------|
| Fundraising Manager | `fundraising-manager` | Campaigns, donor relations, and pipeline growth. |
| Grants Manager | `grants-manager` | Grant discovery, applications, and compliance reporting. |

### 🙋 Personal

| Agent | Slug | Description |
|-------|------|-------------|
| Fortnite Coach | `fortnite-coach` | Mechanics, game sense, rotations, and ranked improvement. |
| Gym Coach | `gym-coach` | Safe programming, progressive overload, and sustainable training. |
| General Doctor | `general-doctor` | Triage, health education, and guidance on when to seek in-person care. |
| Mental Health Coach | `mental-health-coach` | Coping skills and support (not therapy). |
| Nutrition Coach | `nutrition-coach` | Sustainable eating habits and basic plans. |
| Productivity Coach | `productivity-coach` | Routines, prioritization, and execution. |
| Travel Planner | `travel-planner` | Itineraries, budgets, and logistics. |
| Atlas | `atlas` | GTD, time blocking, Eisenhower matrix, Pomodoro. *(ES)* |
| Sofía | `sofia-psicologa` | CBT, humanist approach, mindfulness, ACT. Emotional support. *(ES)* |

### 🏠 Real Estate

| Agent | Slug | Description |
|-------|------|-------------|
| Real Estate Advisor | `real-estate-advisor` | Property evaluation, listings, and transaction guidance. |
| Property Manager | `property-manager` | Operations, tenant relations, and maintenance planning. |

### 🏆 Sports

| Agent | Slug | Description |
|-------|------|-------------|
| Sports Analyst | `sports-analyst` | Performance breakdowns, stats, and insights. |
| Performance Coach | `performance-coach` | Training plans, conditioning, and recovery. |

### 💻 Tech

| Agent | Slug | Description |
|-------|------|-------------|
| Backend Engineer | `backend-engineer` | APIs, data models, and scalable services. |
| BI Analyst | `bi-analyst` | Dashboards, KPI definitions, and business reporting. |
| Data Analyst | `data-analyst` | SQL analysis, dashboards, and actionable insights. |
| Data Engineer | `data-engineer` | Pipelines, data quality, and reliable data platforms. |
| Data Scientist | `data-scientist` | Modeling, experimentation, and statistical analysis. |
| Linus Dev | `linus-dev` | Pragmatic senior engineer. Code review, debugging, architecture. Python, TS, Go, SQL. |
| CI/CD Engineer | `ci-cd-engineer` | Pipelines, build systems, and release automation. |
| Frontend Engineer | `frontend-engineer` | UI performance, accessibility, and client architecture. |
| Cloud Architect | `cloud-architect` | Scalable architectures, cost efficiency, and security. |
| Platform Engineer | `platform-engineer` | Internal platforms, developer experience, and reliability. |
| ML Engineer | `ml-engineer` | Model deployment, evaluation, and MLOps reliability. |
| Mobile Engineer | `mobile-engineer` | iOS/Android development, performance, and reliability. |
| Technical PM | `technical-pm` | Roadmap, requirements, and cross-team alignment. |
| QA Engineer | `qa-engineer` | Test strategy, automation, and release quality. |
| AppSec Engineer | `appsec-engineer` | Secure development, threat modeling, and secure code review. |
| Sentinel | `sentinel` | Threat modeling, infra/code audit, CVE management, incident response. |
| SOC Analyst | `soc-analyst` | Monitoring, triage, and incident response coordination. |
| UX Researcher | `ux-researcher` | User studies, insights, and research plans. |
| UX Writer | `ux-writer` | Clear product microcopy and consistent voice. |

---

## Workflow Catalog

34 orchestration patterns available in English and Spanish:

| Workflow | Description |
|----------|-------------|
| [Abogado del Diablo / Devil's Advocate](./workflow/EN/devils-advocate) | Challenge assumptions to harden proposals |
| [Audit Mode](./workflow/EN/audit-mode) | Executor + Auditor + Signer — 3-way approval |
| [Automatic On-Call](./workflow/EN/automatic-on-call) | Auto-rotation on-call scheduling |
| [Blackboard / Pizarrón](./workflow/EN/blackboard) | Shared knowledge space for emergent multi-agent solutions |
| [Budget Router](./workflow/EN/budget-router) | Route by cost/budget efficiency |
| [Canary Rollout](./workflow/EN/canary-rollout) | Gradual deployment with staged rollout |
| [Chain of Thought](./workflow/EN/chain-of-thought) | Sequential reasoning steps |
| [Checkpoint / Snapshot](./workflow/EN/checkpoint-snapshot) | Save and resume workflow state at any point |
| [Committee Mode](./workflow/EN/committee-mode) | Multi-agent voting on decisions |
| [Consensus Voting](./workflow/EN/consensus-voting) | Agreement-based decision making |
| [Escalation Chain](./workflow/EN/escalation-chain) | Tier-based escalation protocol |
| [Feedback Loop](./workflow/EN/feedback-loop) | Iterative improvement cycles |
| [Follow the Sun](./workflow/EN/follow-the-sun) | Global timezone handoff |
| [Hub and Spoke](./workflow/EN/hub-and-spoke) | Central coordination with distributed execution |
| [Human-in-the-Loop](./workflow/EN/human-in-the-loop) | Mandatory human approval gates in autonomous workflows |
| [Incident Mode](./workflow/EN/incident-mode) | Crisis response protocol |
| [Map Reduce](./workflow/EN/map-reduce) | Divide-and-conquer parallel processing |
| [Mentor Mode](./workflow/EN/mentor-mode) | Teaching and knowledge transfer |
| [On-Demand Specialist](./workflow/EN/on-demand-specialist) | Expert consultation on-the-fly |
| [Pair Programming](./workflow/EN/pair-programming) | Driver + Navigator realtime collaboration |
| [Parallel Swarm](./workflow/EN/parallel-swarm) | Concurrent multi-agent execution |
| [RACI Matrix](./workflow/EN/raci-matrix) | Role-based responsibility assignment |
| [Red Team / Blue Team](./workflow/EN/red-team-blue-team) | Adversarial testing |
| [Research → Execution](./workflow/EN/research-execution) | Investigate first, then execute |
| [Retry / Rollback](./workflow/EN/retry-rollback) | Failure recovery with rollback |
| [Round Robin](./workflow/EN/round-robin) | Sequential agent rotation |
| [Saga](./workflow/EN/saga) | Distributed multi-step transactions with compensation |
| [Scatter-Gather](./workflow/EN/scatter-gather) | Broadcast to N solvers, select the best result |
| [Stage Pipeline](./workflow/EN/stage-pipeline) | Multi-stage sequential workflow |
| [Technical Arbiter](./workflow/EN/technical-arbiter) | Technical dispute resolution |
| [Triage](./workflow/EN/triage) | Classify and prioritize incoming work |
| [Watchdog Supervisor](./workflow/EN/watchdog-supervisor) | Continuous monitoring and alerting |
| [Weekly Planning](./workflow/EN/weekly-planning) | Sprint planning and retrospective |
| [Workflow Composition](./workflow/EN/workflow-composition) | Nested and composable workflows |

---

## Contribute

The easiest way is via the **web UI**: [craw-agents.vercel.app/contribute](https://craw-agents.vercel.app/contribute)

1. Sign in with Google
2. Complete the 3-step wizard (Basic info → Files → Review)
3. A PR is opened automatically — no git required

### Manual contribution

1. Fork this repo
2. Copy `agents/_template/` to your new path:
   ```
   agents/<lang>/<category>/<subcategory>/<your-slug>/
   ```
3. Fill in all 8 files
4. Run the registry builder:
   ```bash
   node scripts/build-registry.js
   ```
5. Submit a PR

> **Note:** When your PR is merged, a GitHub Action automatically rebuilds the registry and triggers a Vercel redeploy — the agent appears on the site within ~1 minute.

### Categories

| Category | Emoji | Examples |
|----------|-------|---------|
| `tech/` | 💻 | `dev`, `sre`, `security`, `devops`, `data`, `frontend`, `backend`, `ml`, `mobile`, `qa`, `ux` |
| `business/` | 💼 | `sales`, `ops`, `product`, `hr`, `procurement`, `revops`, `partnerships`, `customer-success` |
| `marketing/` | 📣 | `lead`, `brand`, `seo`, `content`, `community`, `performance`, `lifecycle` |
| `creative/` | 🎨 | `content`, `film`, `design`, `audio`, `video`, `illustration` |
| `personal/` | 🙋 | `gym`, `gaming`, `medical`, `nutrition`, `mental-health`, `productivity`, `travel` |
| `finance/` | 📊 | `fpna`, `accounting` |
| `education/` | 🎓 | `academic`, `teacher`, `research` |
| `health/` | 🏥 | `nutrition`, `physio`, `pharmacy` |
| `legal/` | ⚖️ | `privacy`, `ip` |
| `logistics/` | 🚚 | `supply-chain` |
| `manufacturing/` | 🏭 | `operations`, `quality` |
| `nonprofit/` | 🤝 | `fundraising`, `grants` |
| `real-estate/` | 🏠 | `advisory`, `property-management` |
| `sports/` | 🏆 | `analytics`, `coaching` |
| `hospitality/` | 🏨 | `chef`, `hotel-management` |
| `government/` | 🏛️ | `policy` |
| `devops/` | ⚙️ | `sre`, `ci-cd`, `platform`, `cloud` |

### Quality checklist

- [ ] `SOUL.md` has a clear personality and operational rules
- [ ] `USER.md` is a generic template (no personal data)
- [ ] `BOOTSTRAP.md` has a natural onboarding conversation starter
- [ ] `meta.yaml` has accurate tags and category
- [ ] No hardcoded credentials or personal info

---

## Architecture

```
GitHub repo
  ├── agents/
  │    ├── EN/                  ← English agent bundles
  │    ├── ES/                  ← Spanish agent bundles
  │    └── _template/           ← scaffold for new agents
  ├── workflow/
  │    ├── EN/                  ← English orchestration patterns
  │    └── ES/                  ← Spanish orchestration patterns
  ├── scripts/
  │    └── build-registry.js    ← generates agents-data.ts, workflows-data.ts, JSON
  └── web/                      ← Next.js 16 + Tailwind v4 + TypeScript
       ├── app/                 ← App Router (agents, workflows, contribute, docs)
       ├── components/          ← AgentCard, WorkflowCard, Search, ContributeForm
       └── lib/
            ├── agents-data.ts      ← auto-generated agent registry
            └── workflows-data.ts   ← auto-generated workflow registry

CI/CD
  ├── push to main → GitHub Action rebuilds registry → commit [skip ci]
  └── any commit to main → GitHub webhook → Vercel deploy hook → auto-deploy
```

**Auth:** NextAuth v5 (Google OAuth) with JWT strategy — no database required.  
**Contributions:** PR-based workflow. `POST /api/contribute` creates a branch and opens a PR automatically.

---

## Why full bundles?

Most agent repos ship only a `SOUL.md`. That tells the agent *who to be*, but not *how to operate*.

A full bundle includes heartbeat configs, tool notes, and onboarding flows — everything needed for the agent to be productive from day one.

---

## License

MIT
