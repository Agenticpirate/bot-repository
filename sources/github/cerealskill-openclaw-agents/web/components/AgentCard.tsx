'use client'

import type { AgentListItem } from '@/lib/agents-types'
import { CATEGORY_ICONS } from '@/lib/agents-types'
import { useI18n } from '@/lib/i18n'

export default function AgentCard({ agent }: { agent: AgentListItem }) {
  const { t } = useI18n()
  return (
    <a href={`/agents/${agent.slug}`} className="block group">
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
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </h3>
            <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {CATEGORY_ICONS[agent.category] ?? '📦'} {agent.subcategory ?? agent.category}
            </p>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--cyan-mid)',
              border: '1px solid var(--border)',
            }}
          >
            {agent.model}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
          {agent.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* SOUL ID Badge */}
        {agent.soul_id && (
          <a
            href={`https://registry.soulid.io/resolve/${agent.soul_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 mb-3 w-fit px-2 py-1 rounded-full text-xs font-mono transition-opacity hover:opacity-80"
            style={{
              background: 'rgba(167, 139, 250, 0.08)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              color: '#a78bfa',
            }}
          >
            <span>⚡</span>
            <span>{agent.soul_id}</span>
          </a>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t.byAuthor(agent.author)}
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
