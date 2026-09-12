'use client'

import { useState, useMemo, useEffect } from 'react'
import WorkflowCard from './WorkflowCard'
import type { WorkflowMeta } from '@/lib/workflows'
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

export default function WorkflowGrid({ workflows }: { workflows: WorkflowMeta[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useSessionState('workflows:query', '')
  const [isFocused, setIsFocused] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return workflows
    return workflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.objective.toLowerCase().includes(q) ||
      w.slug.toLowerCase().includes(q)
    )
  }, [workflows, query])

  return (
    <>
      {/* Search bar */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-6 space-y-3">
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
          {query && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.workflowCount(filtered.length)}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
            <p className="text-5xl mb-4">🤷</p>
            <p className="text-lg">{t.noWorkflows(query)}</p>
            <button
              onClick={() => setQuery('')}
              className="mt-4 text-sm underline transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t.clearSearch}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(w => (
              <WorkflowCard key={w.slug} workflow={w} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
