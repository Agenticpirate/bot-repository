'use client'

import type { WorkflowMeta } from '@/lib/workflows'
import { useI18n } from '@/lib/i18n'

const WORKFLOW_EMOJI: Record<string, string> = {
  'audit-mode': '🔍',
  'automatic-on-call': '📟',
  'committee-mode': '🏛️',
  'consensus-voting': '🗳️',
  'escalation-chain': '⬆️',
  'follow-the-sun': '🌍',
  'hub-and-spoke': '🕸️',
  'incident-mode': '🚨',
  'map-reduce': '🗺️',
  'mentor-mode': '🎓',
  'on-demand-specialist': '🧠',
  'pair-programming': '👥',
  'parallel-swarm': '🐝',
  'raci-matrix': '📋',
  'red-team-blue-team': '🛡️',
  'research-execution': '🔬',
  'round-robin': '🔄',
  'stage-pipeline': '🔧',
  'technical-arbiter': '⚖️',
  'triage': '🏥',
  'watchdog-supervisor': '👁️',
  'weekly-planning': '📅',
  'retry-rollback': '🔁',
  'feedback-loop': '🔃',
  'chain-of-thought': '🔗',
  'canary-rollout': '🐤',
  'workflow-composition': '🧩',
  'budget-router': '💰',
}

export default function WorkflowCard({ workflow }: { workflow: WorkflowMeta }) {
  const { t } = useI18n()
  const emoji = WORKFLOW_EMOJI[workflow.groupId] ?? '⚡'

  return (
    <a href={`/workflows/${workflow.slug}`} className="block group">
      <div
        className="rounded-xl p-5 h-full flex flex-col transition-all duration-200"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--card-hover-border)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px var(--card-hover-glow)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.01)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            <span className="mr-2">{emoji}</span>{workflow.name}
          </h3>
        </div>

        {/* Objective */}
        <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
          {workflow.objective}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            workflow
          </span>
          <span
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--cyan-bright)' }}
          >
            {t.viewAgent}
          </span>
        </div>
      </div>
    </a>
  )
}
