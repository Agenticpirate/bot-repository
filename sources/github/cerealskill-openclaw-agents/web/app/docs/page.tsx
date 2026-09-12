import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10 pb-2">
      {children}
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-bold mb-4">{children}</h2>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold mb-2 mt-6" style={{ color: 'var(--text-primary)' }}>{children}</h3>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm sm:text-base leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{children}</p>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
      <code className="text-sm font-mono whitespace-pre leading-relaxed" style={{ color: '#3fb950' }}>
        {children}
      </code>
    </div>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--cyan-bright)', border: '1px solid var(--border)' }}>
      {children}
    </code>
  )
}

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 mb-4 flex gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <span className="text-lg shrink-0">{icon}</span>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</p>
    </div>
  )
}

function FileTable({ rows }: { rows: { file: string; desc: string; required: boolean }[] }) {
  return (
    <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>File</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Purpose</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Required</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.file} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined }}>
              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--cyan-bright)', whiteSpace: 'nowrap' }}>{r.file}</td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{r.desc}</td>
              <td className="px-4 py-3 text-xs font-bold" style={{ color: r.required ? '#3fb950' : 'var(--text-muted)' }}>{r.required ? 'Yes' : 'Optional'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const NAV_ITEMS = [
  { id: 'what-is', label: 'What is Soul ID?' },
  { id: 'install-agent', label: 'Install an Agent' },
  { id: 'bundle-structure', label: 'Bundle Structure' },
  { id: 'use-workflows', label: 'Using Workflows' },
  { id: 'teams', label: 'Teams' },
  { id: 'workflow-patterns', label: 'Workflow Patterns' },
  { id: 'contribute', label: 'Contributing' },
  { id: 'faq', label: 'FAQ' },
]

const BUNDLE_FILES = [
  { file: 'SOUL.md', desc: 'Core identity — personality, values, tone, and behavioral rules. The most important file.', required: true },
  { file: 'IDENTITY.md', desc: 'Display name, creature type, emoji, and visual avatar metadata.', required: true },
  { file: 'USER.md', desc: 'Context about the person this agent works with (name, role, preferences).', required: true },
  { file: 'AGENTS.md', desc: 'Workspace operating rules, memory conventions, and session startup checklist.', required: true },
  { file: 'HEARTBEAT.md', desc: 'Periodic background tasks executed on a schedule (daily reviews, cleanups, etc.).', required: false },
  { file: 'TOOLS.md', desc: 'Local tool configuration, environment notes, and integration-specific settings.', required: false },
  { file: 'BOOTSTRAP.md', desc: 'First-run setup guide — onboarding instructions the agent follows on day one.', required: false },
  { file: 'meta.yaml', desc: 'Registry metadata: name, slug, category, tags, model preference, and version.', required: true },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <img src="/soulid-logo.png" alt="Soul ID logo" className="shrink-0" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>Soul ID</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--cyan-bright)' }}>Docs</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium transition-all" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              ← Back
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex gap-12">

        {/* Sidebar nav — desktop only */}
        <aside className="hidden lg:block shrink-0 w-52 sticky top-10 self-start">
          <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--text-muted)' }}>On this page</p>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm py-1.5 px-3 rounded-lg transition-all hover:opacity-100"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <Link
              href="/contribute"
              className="block text-center text-xs font-semibold py-2.5 px-4 rounded-xl transition-all hover:brightness-110"
              style={{ background: 'var(--cyan-bright)', color: 'var(--btn-text)' }}
            >
              + Contribute an agent
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-3xl">

          {/* Hero */}
          <div className="mb-10">
            <p className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Documentation</p>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4">Soul ID Docs</h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Everything you need to install agents, run multi-agent workflows, and contribute back to the catalog.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* What is Soul ID */}
          <Section id="what-is">
            <SectionTitle>What is Soul ID?</SectionTitle>
            <Prose>
              Soul ID is a curated marketplace of production-ready <strong>OpenClaw agent bundles</strong> and <strong>multi-agent workflow patterns</strong> — available in English and Spanish.
            </Prose>
            <Prose>
              Unlike repos that only ship a single prompt file, every agent here includes a <strong>complete workspace bundle</strong> — SOUL, IDENTITY, USER context, memory conventions, periodic tasks, tool config, and a bootstrap guide — ready to drop into OpenClaw and start working immediately.
            </Prose>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-4">
              {[
                { icon: '🦀', label: 'Agents', desc: '146+ production-ready bundles across 17 categories' },
                { icon: '🔀', label: 'Workflows', desc: '34 orchestration patterns for multi-agent coordination' },
                { icon: '👥', label: 'Teams', desc: '9 pre-built agent rosters ready to deploy together' },
                { icon: '🌐', label: 'Bilingual', desc: 'Every agent, workflow, and team available in EN and ES' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="text-3xl mb-2">{card.icon}</div>
                  <div className="font-semibold text-sm mb-1">{card.label}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Install an Agent */}
          <Section id="install-agent">
            <SectionTitle>Install an Agent</SectionTitle>
            <Prose>
              The fastest way to install an agent is directly from the Soul ID UI. Open any agent page, click <strong>Deploy in OpenClaw</strong>, and the install command is copied to your clipboard. Then paste it into OpenClaw.
            </Prose>

            <SubTitle>One-line CLI install</SubTitle>
            <Prose>You can also install any agent from your terminal using the install script:</Prose>
            <CodeBlock>{`# Install an agent (prompts you to select a workspace)
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s agent <slug> EN

# Example: install pedro-sre in English
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s agent pedro-sre EN

# Example: install in Spanish
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s agent pedro-sre ES`}
            </CodeBlock>

            <SubTitle>Install script parameters</SubTitle>
            <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Parameter</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Values</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p: '1st', v: 'agent | workflow', d: 'What to install' },
                    { p: '2nd', v: '<slug>', d: 'Agent or workflow slug, e.g. pedro-sre or incident-mode' },
                    { p: '3rd', v: 'EN | ES', d: 'Language variant to install' },
                  ].map((r, i) => (
                    <tr key={r.p} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)', borderBottom: i < 2 ? '1px solid var(--border)' : undefined }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--cyan-bright)' }}>{r.p}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{r.v}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubTitle>Manual install</SubTitle>
            <Prose>
              Download the <InlineCode>.tar.gz</InlineCode> from any agent page, extract it, and copy the folder into your OpenClaw workspace directory (usually <InlineCode>~/.openclaw/workspace-&lt;name&gt;/agents/&lt;slug&gt;/</InlineCode>).
            </Prose>

            <Callout icon="💡">
              After installing, open OpenClaw, select the workspace where you installed the agent, and start a new session. The agent loads its SOUL and AGENTS files automatically on startup.
            </Callout>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Bundle Structure */}
          <Section id="bundle-structure">
            <SectionTitle>Bundle Structure</SectionTitle>
            <Prose>
              Every agent bundle is a self-contained directory. When you install an agent, the following files are copied into your workspace. OpenClaw reads them in a defined order to build the agent&apos;s context window on session start.
            </Prose>

            <CodeBlock>{`agents/<lang>/<category>/<subcategory>/<slug>/
  ├── meta.yaml       ← registry metadata
  ├── SOUL.md         ← core identity (loaded first)
  ├── IDENTITY.md     ← display name & avatar
  ├── USER.md         ← your personal context
  ├── AGENTS.md       ← workspace rules & memory conventions
  ├── HEARTBEAT.md    ← periodic background tasks
  ├── TOOLS.md        ← local tool config
  └── BOOTSTRAP.md    ← first-run setup guide`}
            </CodeBlock>

            <FileTable rows={BUNDLE_FILES} />

            <SubTitle>Load order</SubTitle>
            <Prose>
              OpenClaw loads bundle files in this priority order on session start: <InlineCode>SOUL.md</InlineCode> → <InlineCode>IDENTITY.md</InlineCode> → <InlineCode>USER.md</InlineCode> → <InlineCode>AGENTS.md</InlineCode>. The remaining files are loaded on-demand or on schedule.
            </Prose>

            <SubTitle>Customizing your install</SubTitle>
            <Prose>
              Edit <InlineCode>USER.md</InlineCode> with your name, role, timezone, and preferences. This is the most impactful personalization — the agent uses this context in every session. Edit <InlineCode>TOOLS.md</InlineCode> to add local environment details (API endpoints, repo paths, team contacts).
            </Prose>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Using Workflows */}
          <Section id="use-workflows">
            <SectionTitle>Using Workflows</SectionTitle>
            <Prose>
              Workflows define <strong>multi-agent orchestration patterns</strong> — how multiple agents coordinate, vote, escalate, and hand off work. Each workflow ships as an <InlineCode>ORCHESTRATION.md</InlineCode> (EN) or <InlineCode>ORQUESTACION.md</InlineCode> (ES) file you install into a workspace.
            </Prose>

            <SubTitle>Install a workflow</SubTitle>
            <CodeBlock>{`# Install a workflow — the script prompts you to pick a workspace
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s workflow <slug> EN

# Example: install the incident-mode workflow
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s workflow incident-mode EN`}
            </CodeBlock>

            <Prose>
              The script copies the <InlineCode>ORCHESTRATION.md</InlineCode> file into your selected agent workspace. You can then reference it when instructing OpenClaw to coordinate multiple agents.
            </Prose>

            <SubTitle>How to activate a workflow in OpenClaw</SubTitle>
            <Prose>
              Workflows are instructions for the orchestrator agent — typically your main agent or a dedicated coordinator. To activate one:
            </Prose>

            <div className="space-y-3 mb-6">
              {[
                { step: '1', title: 'Install the workflow', desc: 'Run the install command above. The ORCHESTRATION.md lands in your workspace.' },
                { step: '2', title: 'Open OpenClaw', desc: 'Start a session with your coordinator agent or main workspace agent.' },
                { step: '3', title: 'Reference the workflow', desc: 'Tell the agent: "Follow the Incident Mode workflow in ORCHESTRATION.md to handle this alert." The agent reads the file and coordinates accordingly.' },
                { step: '4', title: 'Assign sub-agents', desc: 'The workflow diagram and roles section tells you which specialist agents to involve. Add them to the multi-agent session.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4 items-start rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--cyan-bright)', color: 'var(--btn-text)' }}>{s.step}</div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{s.title}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Callout icon="🔀">
              Workflows are <strong>language-agnostic protocols</strong> — they describe coordination logic, not content. You can use an EN workflow with ES agents, or mix languages freely. The pattern is what matters.
            </Callout>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Teams */}
          <Section id="teams">
            <SectionTitle>Teams</SectionTitle>
            <Prose>
              A <strong>Team</strong> is a pre-configured roster of agents that work together toward a shared goal, optionally wired to a workflow pattern. Teams are a first-class concept in Soul ID — you can browse them in the catalog, deploy all members at once, and drop them straight into OpenClaw.
            </Prose>
            <Prose>
              Each team ships as two files: a <InlineCode>team.yaml</InlineCode> that declares the roster and metadata, and a <InlineCode>ROSTER.md</InlineCode> that explains the objective, interaction model, and use cases in human-readable form.
            </Prose>

            <SubTitle>team.yaml structure</SubTitle>
            <CodeBlock>{`teams/<lang>/<category>/<slug>/
  ├── team.yaml    ← roster metadata
  └── ROSTER.md   ← human-readable interaction guide`}
            </CodeBlock>
            <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Field</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Description</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Required</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'name', d: 'Display name of the team', r: true },
                    { f: 'slug', d: 'URL-safe identifier used in installs and registry', r: true },
                    { f: 'description', d: 'One-line summary of what the team does together', r: true },
                    { f: 'category', d: 'Team category (devops, development, marketing, security, …)', r: true },
                    { f: 'members', d: 'List of agent slugs with their role in this team', r: true },
                    { f: 'workflow', d: 'Workflow slug this team follows (e.g. incident-mode)', r: false },
                    { f: 'tags', d: 'Array of searchable tags', r: false },
                    { f: 'language', d: 'en or es', r: true },
                    { f: 'version', d: 'Semver string (1.0.0)', r: true },
                  ].map((row, i) => (
                    <tr key={row.f} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)', borderBottom: i < 8 ? '1px solid var(--border)' : undefined }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--cyan-bright)', whiteSpace: 'nowrap' }}>{row.f}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.d}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: row.r ? '#3fb950' : 'var(--text-muted)' }}>{row.r ? 'Yes' : 'Optional'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubTitle>ROSTER.md structure</SubTitle>
            <Prose>
              The <InlineCode>ROSTER.md</InlineCode> is a markdown document that describes the team in detail. It follows a standard template with sections for <strong>Team</strong>, <strong>Objective</strong>, <strong>Members</strong> (table with agent, role, and responsibility), <strong>Interaction Model</strong> (ASCII flow diagram), <strong>When to Use</strong>, <strong>Use Cases</strong>, and <strong>Rules</strong>.
            </Prose>

            <SubTitle>Deploying a team</SubTitle>
            <Prose>
              Open any team page in the Soul ID catalog and click <strong>Deploy Team</strong>. This installs all member agents into your OpenClaw instance at once. You can also install members individually using the standard agent install command:
            </Prose>
            <CodeBlock>{`# Install each team member individually
curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh \\
  | bash -s agent <member-slug> EN`}
            </CodeBlock>

            <SubTitle>Activating the team workflow</SubTitle>
            <Prose>
              Most teams reference a workflow in their <InlineCode>team.yaml</InlineCode>. After installing all members, install the linked workflow into your coordinator agent workspace. Then instruct the coordinator: <em>&quot;Use the [workflow name] defined in ORCHESTRATION.md — the full team roster is in ROSTER.md.&quot;</em>
            </Prose>

            <Callout icon="👥">
              Teams are declarative — they define <strong>who</strong> collaborates and <strong>how</strong>, but each member agent retains its full individual identity, SOUL, and expertise. A team is a coordination contract on top of existing agents.
            </Callout>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Workflow Patterns */}
          <Section id="workflow-patterns">
            <SectionTitle>Workflow Patterns Reference</SectionTitle>
            <Prose>34 orchestration patterns organized by use case. Each links to its full ORCHESTRATION.md.</Prose>

            {[
              {
                category: '🚨 Incident & Operations',
                items: [
                  { slug: 'incident-mode', name: 'Incident Mode', desc: 'Crisis response — IC, Comms, Tech Lead roles with clear command structure.' },
                  { slug: 'automatic-on-call', name: 'Automatic On-Call', desc: 'Auto-rotation on-call scheduling with escalation paths.' },
                  { slug: 'watchdog-supervisor', name: 'Watchdog Supervisor', desc: 'Continuous monitoring loop with alert thresholds and auto-escalation.' },
                  { slug: 'triage', name: 'Triage', desc: 'Classify and prioritize incoming work by severity and ownership.' },
                  { slug: 'escalation-chain', name: 'Escalation Chain', desc: 'Tier-based escalation — L1 → L2 → L3 with SLA gates.' },
                ],
              },
              {
                category: '🔄 Execution & Resilience',
                items: [
                  { slug: 'retry-rollback', name: 'Retry / Rollback', desc: 'Transient failure retry with exponential backoff and state compensation.' },
                  { slug: 'saga', name: 'Saga', desc: 'Distributed multi-step transactions — each step has a compensating undo action.' },
                  { slug: 'canary-rollout', name: 'Canary Rollout', desc: 'Gradual deployment with staged rollout gates and automatic rollback.' },
                  { slug: 'checkpoint-snapshot', name: 'Checkpoint / Snapshot', desc: 'Save and resume workflow state — pause long workflows, branch, or rollback.' },
                  { slug: 'stage-pipeline', name: 'Stage Pipeline', desc: 'Multi-stage sequential processing with defined handoff contracts.' },
                ],
              },
              {
                category: '🧠 Decision & Review',
                items: [
                  { slug: 'audit-mode', name: 'Audit Mode', desc: 'Three-role sign-off: Executor → Auditor → Signer before any action lands.' },
                  { slug: 'committee-mode', name: 'Committee Mode', desc: 'Multi-agent voting on decisions — quorum, veto, and tie-break rules.' },
                  { slug: 'consensus-voting', name: 'Consensus Voting', desc: 'Agreement-based decision with configurable consensus threshold.' },
                  { slug: 'red-team-blue-team', name: 'Red / Blue Team', desc: 'Adversarial quality testing — Blue builds, Red attacks, Blue fixes.' },
                  { slug: 'devils-advocate', name: "Devil's Advocate", desc: 'Dedicated challenger agent stress-tests proposals before commitment.' },
                  { slug: 'technical-arbiter', name: 'Technical Arbiter', desc: 'Neutral expert resolves technical disputes between two positions.' },
                  { slug: 'human-in-the-loop', name: 'Human-in-the-Loop', desc: 'Mandatory human approval gates at configurable risk thresholds.' },
                ],
              },
              {
                category: '⚡ Parallel & Distribution',
                items: [
                  { slug: 'parallel-swarm', name: 'Parallel Swarm', desc: 'Divide work into independent chunks — all run simultaneously, merge at the end.' },
                  { slug: 'map-reduce', name: 'Map Reduce', desc: 'Divide-and-conquer: map work to N agents, reduce outputs into one result.' },
                  { slug: 'scatter-gather', name: 'Scatter-Gather', desc: 'Broadcast the same task to N solvers, score responses, pick the best.' },
                  { slug: 'round-robin', name: 'Round Robin', desc: 'Sequential agent rotation — balanced load distribution without a coordinator.' },
                  { slug: 'follow-the-sun', name: 'Follow the Sun', desc: 'Global timezone handoff — work follows daylight hours across regions.' },
                ],
              },
              {
                category: '🔬 Research & Knowledge',
                items: [
                  { slug: 'chain-of-thought', name: 'Chain of Thought', desc: 'Sequential reasoning steps — each agent builds on the previous conclusion.' },
                  { slug: 'research-execution', name: 'Research → Execution', desc: 'Investigate first, validate assumptions, then execute with confidence.' },
                  { slug: 'blackboard', name: 'Blackboard', desc: 'Shared knowledge space — specialists read/write a central board, solution emerges.' },
                  { slug: 'feedback-loop', name: 'Feedback Loop', desc: 'Iterative improvement — output feeds back as input until quality threshold is met.' },
                ],
              },
              {
                category: '🤝 Collaboration',
                items: [
                  { slug: 'hub-and-spoke', name: 'Hub and Spoke', desc: 'Central coordinator delegates to specialist spokes and synthesizes results.' },
                  { slug: 'pair-programming', name: 'Pair Programming', desc: 'Driver + Navigator realtime collaboration — roles switch on a cadence.' },
                  { slug: 'mentor-mode', name: 'Mentor Mode', desc: 'Teaching pattern — senior agent explains and reviews junior agent work.' },
                  { slug: 'on-demand-specialist', name: 'On-Demand Specialist', desc: 'Pull in expert consultation on the fly without restructuring the session.' },
                  { slug: 'raci-matrix', name: 'RACI Matrix', desc: 'Role-based responsibility: Responsible, Accountable, Consulted, Informed.' },
                  { slug: 'weekly-planning', name: 'Weekly Planning', desc: 'Sprint planning and retrospective — backlog, velocity, blockers cycle.' },
                ],
              },
              {
                category: '🏗️ Meta & Composition',
                items: [
                  { slug: 'workflow-composition', name: 'Workflow Composition', desc: 'Nest and chain workflows — use one workflow as a step inside another.' },
                  { slug: 'budget-router', name: 'Budget Router', desc: 'Route tasks to agents dynamically by cost, latency, or quality budget.' },
                ],
              },
            ].map(group => (
              <div key={group.category} className="mb-8">
                <h3 className="text-base font-bold mb-3 pb-2" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {group.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.items.map(item => (
                    <Link
                      key={item.slug}
                      href={`/workflows/${item.slug}`}
                      className="rounded-xl p-4 transition-all hover:opacity-90"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="font-semibold text-sm mb-1" style={{ color: 'var(--cyan-bright)' }}>{item.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Contributing */}
          <Section id="contribute">
            <SectionTitle>Contributing</SectionTitle>
            <Prose>
              All contributions are welcome. The easiest path is through the web UI — no git required.
            </Prose>

            <SubTitle>Via the web form</SubTitle>
            <div className="space-y-3 mb-6">
              {[
                'Go to /contribute and sign in with Google.',
                'Complete the 3-step wizard: Basic info (name, slug, language, category) → Edit files (SOUL.md and bundle) → Review.',
                'Click Submit PR — a branch and Pull Request are opened automatically on GitHub.',
                'Once reviewed and merged, your agent appears in the catalog.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step}</span>
                </div>
              ))}
            </div>

            <SubTitle>Via GitHub PR</SubTitle>
            <Prose>Fork the repo, create the bundle directory following the structure above, and open a Pull Request against <InlineCode>main</InlineCode>. The <InlineCode>meta.yaml</InlineCode> file is required for registry inclusion.</Prose>
            <CodeBlock>{`# Fork & clone
git clone https://github.com/cerealskill/openclaw-agents.git
cd openclaw-agents

# Create your agent bundle
mkdir -p agents/EN/<category>/<subcategory>/<your-slug>
# Add SOUL.md, IDENTITY.md, USER.md, AGENTS.md, meta.yaml

# Commit and push, then open a PR on GitHub`}
            </CodeBlock>

            <Callout icon="📝">
              The <InlineCode>meta.yaml</InlineCode> must include at minimum: <InlineCode>name</InlineCode>, <InlineCode>slug</InlineCode>, <InlineCode>description</InlineCode>, <InlineCode>category</InlineCode>, <InlineCode>subcategory</InlineCode>, and <InlineCode>version</InlineCode>. The registry build script reads this to generate the catalog.
            </Callout>
          </Section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* FAQ */}
          <Section id="faq">
            <SectionTitle>FAQ</SectionTitle>

            {[
              {
                q: 'What is OpenClaw?',
                a: 'OpenClaw is an AI agent orchestration platform. Agents on this site are designed specifically for OpenClaw workspaces — each bundle follows OpenClaw file conventions and loads automatically on session start.',
              },
              {
                q: 'Can I use these agents with other platforms?',
                a: 'The SOUL.md and IDENTITY.md files are plain markdown — you can read them into any LLM context. The other files (AGENTS.md, HEARTBEAT.md) are OpenClaw-specific conventions. SOUL.md alone is a useful system prompt for any platform.',
              },
              {
                q: 'What\'s the difference between an agent and a workflow?',
                a: 'An agent is a single AI persona with a defined identity, expertise, and operating rules. A workflow is an orchestration protocol that coordinates two or more agents — defining roles, protocols, escalation paths, and deliverables.',
              },
              {
                q: 'How do I customize an agent after installing it?',
                a: 'Edit USER.md with your personal context (name, role, preferences, working style). Edit TOOLS.md for your local environment. You can also edit SOUL.md directly to adjust the agent\'s personality, but keep the core identity section intact.',
              },
              {
                q: 'Are agents available in both English and Spanish?',
                a: 'Yes. Every agent and workflow ships in both EN and ES. The language toggle on the catalog switches the entire UI. When installing via CLI, pass EN or ES as the third argument.',
              },
              {
                q: 'How often is the catalog updated?',
                a: 'The registry is rebuilt on every merge to main. New agents appear in the catalog immediately after their PR is merged. The web app reads from the generated workflows-data.ts and agents-data.ts at build time.',
              },
            ].map((item, i) => (
              <div key={i} className="mb-5 rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm mb-2">{item.q}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.a}</p>
              </div>
            ))}
          </Section>

        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p className="mb-3">
            <a href="/" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Finder</a>
            {' '}·{' '}
            <a href="/docs" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Docs</a>
            {' '}·{' '}
            <a href="/contribute" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Contribute</a>
            {' '}·{' '}
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Privacy</a>
          </p>
          <p>
            © 2026 Soul ID — Built for{' '}
            <a href="https://openclaw.ai" style={{ color: '#e63946' }} className="hover:opacity-80 transition-opacity">OpenClaw</a>
          </p>
        </div>
      </footer>
    </main>
  )
}
