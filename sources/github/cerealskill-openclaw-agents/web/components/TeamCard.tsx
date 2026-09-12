'use client'

import type { TeamMeta } from '@/lib/teams'
import { TEAM_CATEGORY_ICONS } from '@/lib/teams'
import { useI18n } from '@/lib/i18n'

export default function TeamCard({ team }: { team: TeamMeta }) {
  const { t } = useI18n()
  const icon = TEAM_CATEGORY_ICONS[team.category] ?? '👥'
  const memberCount = team.members?.length ?? 0

  return (
    <a href={`/teams/${team.slug}`} className="block group">
      <div
        className="rounded-xl p-5 h-full flex flex-col transition-all duration-200"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--card-hover-border)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px var(--card-hover-glow)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.01)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            <span className="mr-2">{icon}</span>{team.name}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
          {team.description}
        </p>

        {/* Members preview */}
        {memberCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {team.members.slice(0, 4).map(m => (
              <span
                key={m.slug}
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--cyan-bright)',
                  border: '1px solid var(--border)',
                }}
              >
                {m.slug}
              </span>
            ))}
            {memberCount > 4 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                +{memberCount - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              team
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {memberCount} {t.teamMembers}
            </span>
          </div>
          <span className="text-xs font-medium transition-colors" style={{ color: 'var(--cyan-bright)' }}>
            {t.viewAgent}
          </span>
        </div>
      </div>
    </a>
  )
}
