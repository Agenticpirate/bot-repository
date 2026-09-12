'use client'

import React, { Fragment } from 'react'
import { useI18n } from '@/lib/i18n'
import type { TeamMeta } from '@/lib/teams'
import { TEAM_CATEGORY_ICONS } from '@/lib/teams'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'

function renderInlineMarkdown(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} style={{ color: 'var(--md-strong-color)', fontWeight: 700 }}>
          {part.replace(/\*\*/g, '')}
        </strong>
      )
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={i}
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--cyan-bright)',
            padding: '0 4px',
            borderRadius: 4,
            fontSize: '0.9em',
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function isDiagramLine(line: string): boolean {
  return /[┌┐└┘│─┬┴├┤▼▲►◄╔╗╚╝║═╠╣╦╩╬┼]/.test(line) ||
    (/^\s{4,}/.test(line) && /[|\\/<>+\-v^]/.test(line))
}

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|/.test(line)
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s\-:|]+\|/.test(line)
}

function parseTableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

function renderLineMarkdown(line: string) {
  const trimmed = line.trim()
  if (/^#{1,3}\s/.test(trimmed)) {
    const level = trimmed.match(/^(#+)/)?.[1].length ?? 1
    const text = trimmed.replace(/^#+\s/, '')
    const sizes: Record<number, string> = { 1: '1.1em', 2: '1em', 3: '0.95em' }
    return (
      <span style={{ color: 'var(--cyan-bright)', fontWeight: 700, fontSize: sizes[level] ?? '1em' }}>
        {renderInlineMarkdown(text)}
      </span>
    )
  }
  if (/^[-*]\s/.test(trimmed)) {
    return (
      <span>
        <span style={{ color: 'var(--text-muted)' }}>{'  '}</span>
        {renderInlineMarkdown(line.replace(/^(\s*[-*]\s)/, ''))}
      </span>
    )
  }
  return <span>{renderInlineMarkdown(line)}</span>
}

function renderTable(tableLines: string[], startIdx: number) {
  const headerLine = tableLines[0]
  const headers = parseTableCells(headerLine)
  return (
    <div key={`table-${startIdx}`} className="my-1">
      {tableLines.map((line, i) => {
        const lineNum = startIdx + i + 1
        const isSep = isTableSeparator(line)
        if (isSep) {
          return (
            <div key={lineNum} className="grid" style={{ gridTemplateColumns: '30px minmax(0, 1fr)' }}>
              <span className="select-none pr-1 sm:pr-2 text-right" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>{lineNum}</span>
              <span className="pl-1 sm:pl-2 whitespace-pre overflow-hidden" style={{ color: 'var(--text-muted)' }}>{line}</span>
            </div>
          )
        }
        const cells = parseTableCells(line)
        const isHeader = i === 0
        return (
          <div key={lineNum} className="grid" style={{ gridTemplateColumns: '30px minmax(0, 1fr)' }}>
            <span className="select-none pr-1 sm:pr-2 text-right" style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>{lineNum}</span>
            <span className="pl-1 sm:pl-2 whitespace-pre-wrap break-words overflow-hidden">
              <span style={{ color: 'var(--text-muted)' }}>| </span>
              {cells.map((cell, ci) => (
                <Fragment key={ci}>
                  {isHeader ? (
                    <span style={{ color: 'var(--cyan-bright)', fontWeight: 700 }}>{cell}</span>
                  ) : (
                    <span>{renderInlineMarkdown(cell)}</span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}> | </span>
                </Fragment>
              ))}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function TeamDetailContent({ teams }: { teams: TeamMeta[] }) {
  const { t, lang } = useI18n()

  const team = teams.find(t => t.lang?.toUpperCase() === lang) ?? teams[0]
  const icon = TEAM_CATEGORY_ICONS[team.category] ?? '👥'
  const lines = team.roster ? team.roster.split('\n') : []
  const totalLines = lines.length
  const totalWords = team.roster ? team.roster.split(/\s+/).filter(Boolean).length : 0
  const memberCount = team.members?.length ?? 0

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          {/* Top nav */}
          <div className="flex items-center justify-between mb-8 gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              ← {t.tabTeams}
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              👥 {t.tabTeams}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {icon} {team.name}
            </h1>
            {team.description && (
              <p className="max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {team.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* Main: ROSTER.md viewer */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            ROSTER.md
          </h2>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {/* File tab header */}
            <div
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono"
              style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
            >
              <span>📋</span>
              <span style={{ color: 'var(--cyan-bright)' }}>ROSTER.md</span>
              <span style={{ color: 'var(--text-muted)' }}>— {t.teamRosterDesc}</span>
            </div>

            {/* File content */}
            <div className="px-3 py-4 sm:p-6 overflow-x-auto">
              <div className="text-xs sm:text-sm leading-relaxed font-mono" style={{ color: 'var(--text-primary)', minWidth: 0 }}>
                {(() => {
                  const elements: React.ReactNode[] = []
                  let i = 0
                  while (i < lines.length) {
                    if (isTableLine(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
                      const tableStart = i
                      const tableLines: string[] = []
                      while (i < lines.length && isTableLine(lines[i])) {
                        tableLines.push(lines[i])
                        i++
                      }
                      elements.push(renderTable(tableLines, tableStart))
                      continue
                    }
                    const line = lines[i]
                    const idx = i
                    const diagram = isDiagramLine(line)
                    elements.push(
                      <div key={idx} className="grid" style={{ gridTemplateColumns: diagram ? '30px auto' : '30px minmax(0, 1fr)' }}>
                        <span
                          className="select-none pr-1 sm:pr-2 text-right"
                          style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
                        >
                          {idx + 1}
                        </span>
                        <span className={`pl-1 sm:pl-2 ${diagram ? 'whitespace-pre' : 'whitespace-pre-wrap break-words overflow-hidden'}`}>
                          {line ? renderLineMarkdown(line) : ' '}
                        </span>
                      </div>
                    )
                    i++
                  }
                  return elements
                })()}
              </div>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {t.linesCount}: {totalLines} | {t.wordsCount}: {totalWords}
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Members */}
          {memberCount > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                {t.teamMembersTitle}
              </h3>
              <ul className="space-y-2">
                {team.members.map(m => (
                  <li key={m.slug}>
                    <a
                      href={`/agents/${m.slug}`}
                      className="flex items-start gap-2 text-sm group"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <code
                        className="shrink-0 px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--cyan-bright)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {m.slug}
                      </code>
                      <span className="leading-snug group-hover:opacity-70 transition-opacity">
                        {m.role}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Workflow link */}
          {team.workflow && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                ⚡ {t.tabWorkflows}
              </h3>
              <a
                href={`/workflows/${team.workflow}`}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--cyan-bright)' }}
              >
                {team.workflow} →
              </a>
            </div>
          )}

          {/* Info */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t.info}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>Slug</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{team.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>{t.author}</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{team.author}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>{t.version}</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{team.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>Category</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{team.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>{t.teamMembers}</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{memberCount}</dd>
              </div>
            </dl>
          </div>

          {/* Tags */}
          {team.tags && team.tags.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex flex-wrap gap-1.5">
                {team.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Donate */}
          <div className="flex justify-center">
            <a
              href="https://www.flow.cl/app/web/pagarBtnPago.php?token=gyd282p"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:brightness-110 active:scale-95"
              style={{ background: '#16a34a', color: '#ffffff' }}
            >
              {t.donateAuthor}
            </a>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>
            {t.builtFor}{' '}
            <a href="https://openclaw.ai" style={{ color: 'var(--cyan-bright)' }} className="hover:opacity-80 transition-opacity">
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
