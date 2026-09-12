import ContributeForm from '@/components/ContributeForm'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'
import { getAllAgents } from '@/lib/agents'

export default function ContributePage() {
  const agents = getAllAgents()

  // Build category/subcategory map from existing agents
  const categoryMap: Record<string, Set<string>> = {}
  for (const agent of agents) {
    if (!categoryMap[agent.category]) categoryMap[agent.category] = new Set()
    if (agent.subcategory) categoryMap[agent.category].add(agent.subcategory)
  }
  const categoriesFromRepo = Object.fromEntries(
    Object.entries(categoryMap).map(([cat, subs]) => [cat, Array.from(subs).sort()])
  )

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/soulid-logo.png" alt="Soul ID" style={{ width: 100, height: 100, objectFit: 'contain' }} />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Soul ID</span>
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--cyan-bright)' }}>AI AGENTS</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Contribute an agent
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Submit a new agent bundle to the catalog. It will be reviewed before publishing.
          </p>
        </div>

        <ContributeForm categoriesFromRepo={categoriesFromRepo} />
      </div>
    </main>
  )
}
