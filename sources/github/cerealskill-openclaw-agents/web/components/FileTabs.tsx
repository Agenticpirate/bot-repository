'use client'

import { Fragment, useState } from 'react'
import { BUNDLE_FILES, type BundleFile } from '@/lib/agents-types'
import { useI18n } from '@/lib/i18n'

const FILE_ICONS: Record<BundleFile, string> = {
  'SOUL.md': '🧠',
  'IDENTITY.md': '🪪',
  'USER.md': '👤',
  'AGENTS.md': '🤖',
  'HEARTBEAT.md': '💓',
  'TOOLS.md': '🔧',
  'BOOTSTRAP.md': '🚀',
}

const FILE_DESC_KEYS: Record<BundleFile, string> = {
  'SOUL.md': 'fileDescSoul',
  'IDENTITY.md': 'fileDescIdentity',
  'USER.md': 'fileDescUser',
  'AGENTS.md': 'fileDescAgents',
  'HEARTBEAT.md': 'fileDescHeartbeat',
  'TOOLS.md': 'fileDescTools',
  'BOOTSTRAP.md': 'fileDescBootstrap',
}

function renderInlineMarkdown(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} style={{ color: 'var(--md-strong-color)', fontWeight: 700 }}>
          {part}
        </strong>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function renderLineMarkdown(line: string) {
  const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const text = headingMatch[2]
    const size = level === 1 ? '1.05rem' : level === 2 ? '1rem' : '0.95rem'
    return (
      <span style={{ color: 'var(--cyan-bright)', fontWeight: 700, fontSize: size }}>
        <span style={{ opacity: 0.8 }}>{'#'.repeat(level)} </span>
        {renderInlineMarkdown(text)}
      </span>
    )
  }

  return renderInlineMarkdown(line)
}

export default function FileTabs({ files }: { files: Record<BundleFile, string> }) {
  const { t } = useI18n()
  const [active, setActive] = useState<BundleFile>('SOUL.md')
  const activeContent = files[active] ?? ''
  const lines = activeContent.split('\n')
  const totalLines = activeContent ? lines.length : 0
  const totalWords = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex overflow-x-auto gap-1 pb-1 mb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {BUNDLE_FILES.map(fname => (
          <button
            key={fname}
            onClick={() => setActive(fname)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-150 shrink-0"
            style={
              active === fname
                ? {
                    background: 'var(--cyan-bright)',
                    color: 'var(--btn-text)',
                    fontWeight: '600',
                  }
                : {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }
            }
          >
            <span>{FILE_ICONS[fname]}</span>
            <span>{fname.replace('.md', '')}</span>
          </button>
        ))}
      </div>

      {/* File description */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {(t as any)[FILE_DESC_KEYS[active]]}
      </p>

      {/* Content */}
      <div
        className="rounded-xl p-6 overflow-auto"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {activeContent ? (
          <div className="text-sm leading-relaxed font-mono" style={{ color: 'var(--text-primary)' }}>
            {lines.map((line, idx) => (
              <div key={idx} className="grid" style={{ gridTemplateColumns: '36px 1fr' }}>
                <span
                  className="select-none pr-2 text-right"
                  style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
                >
                  {idx + 1}
                </span>
                <span className="pl-2 whitespace-pre-wrap break-words">{line ? renderLineMarkdown(line) : ' '}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            {t.emptyFile}
          </p>
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        {t.linesCount}: {totalLines} | {t.wordsCount}: {totalWords}
      </p>
    </div>
  )
}
