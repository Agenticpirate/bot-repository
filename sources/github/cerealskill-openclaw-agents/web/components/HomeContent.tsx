'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import type { AgentListItem } from '@/lib/agents-types'
import type { WorkflowMeta } from '@/lib/workflows'
import type { TeamMeta } from '@/lib/teams'
import AgentSearch from '@/components/AgentSearch'
import WorkflowGrid from '@/components/WorkflowGrid'
import TeamGrid from '@/components/TeamGrid'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import AuthButton from '@/components/AuthButton'
import Link from 'next/link'

function useSessionState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = sessionStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch { return initial }
  })
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue]
}

export default function HomeContent({ agents, workflows, teams, stars }: { agents: AgentListItem[]; workflows: WorkflowMeta[]; teams: TeamMeta[]; stars: number | null }) {
  const { t, lang } = useI18n()
  const [activeTab, setActiveTab] = useSessionState<'agents' | 'workflows' | 'teams'>('home:tab', 'agents')

  // Filter by current language
  const filteredAgents = agents.filter(a => (a.lang ?? 'EN').toUpperCase() === lang)
  const filteredWorkflows = workflows.filter(w => w.lang.toUpperCase() === lang)
  const filteredTeams = teams.filter(t => (t.lang ?? 'EN').toUpperCase() === lang)

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8">

          {/* Top nav */}
          <div className="flex items-center justify-between mb-8 sm:mb-10 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/soulid-logo.png" alt="Soul ID logo" className="shrink-0 logo-heartbeat" style={{ width: 100, height: 100, objectFit: 'contain' }} />
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Soul ID
                </span>
                <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--cyan-bright)' }}>
                  AI AGENTS
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/contribute"
                className="add-agent-btn text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap"
                style={{ background: 'var(--cyan-bright)', color: 'var(--btn-text)' }}
              >
                {t.addAgent}
              </Link>
              <a
                href="https://github.com/cerealskill/openclaw-agents"
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                {stars !== null ? (
                  <>
                    <span style={{ color: '#e3b341' }}>★</span>
                    <span>{stars.toLocaleString()}</span>
                  </>
                ) : (
                  t.github
                )}
              </a>
              <AuthButton />
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full mb-6"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--bundles-accent)',
                border: '1px solid var(--bundles-border)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--bundles-accent)' }}
              />
              <span className="bundles-rainbow">{t.bundlesBadge(filteredAgents.length + filteredWorkflows.length + filteredTeams.length)}</span>
            </div>

            <h1
              className="text-3xl sm:text-5xl font-bold leading-tight mb-4"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              {t.heroTitle}{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--cyan-bright), var(--cyan-mid))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {t.heroTitleHighlight}
              </span>
            </h1>


          </div>

        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('agents')}
              className="px-4 py-3 text-sm font-semibold transition-all duration-150 border-b-2"
              style={
                activeTab === 'agents'
                  ? { borderColor: 'var(--cyan-bright)', color: 'var(--cyan-bright)' }
                  : { borderColor: 'transparent', color: 'var(--text-muted)' }
              }
            >
              🤖 {t.tabAgents} ({filteredAgents.length})
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className="px-4 py-3 text-sm font-semibold transition-all duration-150 border-b-2"
              style={
                activeTab === 'workflows'
                  ? { borderColor: 'var(--cyan-bright)', color: 'var(--cyan-bright)' }
                  : { borderColor: 'transparent', color: 'var(--text-muted)' }
              }
            >
              ⚡ {t.tabWorkflows} ({filteredWorkflows.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className="px-4 py-3 text-sm font-semibold transition-all duration-150 border-b-2"
              style={
                activeTab === 'teams'
                  ? { borderColor: 'var(--cyan-bright)', color: 'var(--cyan-bright)' }
                  : { borderColor: 'transparent', color: 'var(--text-muted)' }
              }
            >
              👥 {t.tabTeams} ({filteredTeams.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'agents' ? (
        <AgentSearch agents={filteredAgents} />
      ) : activeTab === 'workflows' ? (
        <WorkflowGrid workflows={filteredWorkflows} />
      ) : (
        <TeamGrid teams={filteredTeams} />
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p className="mb-3">
            <a href="/" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">{t.finder}</a>
            {' '}·{' '}
            <a href="/docs" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">{t.docs}</a>
            {' '}·{' '}
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">{t.privacy}</a>
          </p>
          <p>
            © 2026 Soul ID - {' '}
            {t.builtFor}{' '}
            <a href="https://openclaw.ai" style={{ color: '#e63946' }} className="hover:opacity-80 transition-opacity">
              OpenClaw
            </a>
            {' '}·{' '}
            <a
              href="https://github.com/cerealskill/openclaw-agents"
              style={{ color: 'var(--text-secondary)' }}
              className="hover:opacity-80 transition-opacity"
            >
              {t.contributeGH}
            </a>
            {' '}·{' '}
            <a
              href="https://soul.md/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FF4FA3' }}
              className="hover:opacity-80 transition-opacity font-semibold"
            >
              Soul.md
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}
