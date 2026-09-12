'use client'

import { useState, useMemo, useEffect } from 'react'
import AgentCard from './AgentCard'
import { CATEGORY_ICONS } from '@/lib/agents-types'
import type { AgentListItem } from '@/lib/agents-types'
import { useI18n } from '@/lib/i18n'

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

export default function AgentSearch({ agents }: { agents: AgentListItem[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useSessionState('agents:query', '')
  const [activeCategory, setActiveCategory] = useSessionState<string | null>('agents:category', null)
  const [isFocused, setIsFocused] = useState(false)

  const categories = useMemo(
    () => Array.from(new Set(agents.map(a => a.category))).sort(),
    [agents]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return agents.filter(a => {
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      const matchesCat = !activeCategory || a.category === activeCategory
      return matchesQuery && matchesCat
    })
  }, [agents, query, activeCategory])

  const byCategory = useMemo(() => {
    return filtered.reduce((acc, agent) => {
      const cat = agent.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(agent)
      return acc
    }, {} as Record<string, AgentListItem[]>)
  }, [filtered])

  return (
    <>
      {/* Search bar — same bg as hero, seamless continuation */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-6 space-y-3">
          {/* Input */}
          <div className="relative search-shell rounded-2xl">
            <span
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-all duration-200 ${isFocused ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm"
                style={{
                  color: 'var(--text-muted)',
                  background: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                }}
              >
                🔍
              </span>
            </span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="search-fx w-full rounded-2xl pl-12 pr-10 py-3.5 text-sm transition-all duration-300 outline-none"
              style={{
                background: 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(8px)',
              }}
              onFocus={e => {
                setIsFocused(true)
                e.currentTarget.style.borderColor = 'var(--search-focus-border)'
                e.currentTarget.style.boxShadow = '0 0 20px var(--search-focus-glow)'
              }}
              onBlur={e => {
                setIsFocused(false)
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onMouseEnter={e => {
                if (document.activeElement !== e.currentTarget) {
                  e.currentTarget.style.borderColor = 'var(--search-hover-border)'
                  e.currentTarget.style.boxShadow = '0 0 20px var(--search-hover-glow)'
                }
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
              }}
              onMouseLeave={e => {
                if (document.activeElement !== e.currentTarget) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setActiveCategory(null)}
              className="text-sm px-3 py-1 rounded-full transition-all duration-150 font-medium"
              style={
                activeCategory === null
                  ? { background: 'var(--cyan-bright)', color: 'var(--btn-text)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {t.allCategory}
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className="text-sm px-3 py-1 rounded-full transition-all duration-150 capitalize"
                style={
                  activeCategory === cat
                    ? { background: 'var(--cyan-bright)', color: 'var(--btn-text)', fontWeight: '600' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {CATEGORY_ICONS[cat] ?? '📦'} {cat}
              </button>
            ))}
            {(query || activeCategory) && (
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                {t.resultCount(filtered.length)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
            <p className="text-5xl mb-4">🤷</p>
            <p className="text-lg">{t.noResults(query)}</p>
            <button
              onClick={() => { setQuery(''); setActiveCategory(null) }}
              className="mt-4 text-sm underline transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t.clearSearch}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(byCategory).map(([category, categoryAgents]) => (
              <section key={category}>
                <h2 className="text-lg font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <span className="capitalize">{category}</span>
                  <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({categoryAgents.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAgents.map(agent => (
                    <AgentCard key={agent.slug} agent={agent} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
