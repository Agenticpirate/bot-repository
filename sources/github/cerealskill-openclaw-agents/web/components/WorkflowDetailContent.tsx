'use client'

import React, { Fragment } from 'react'
import { useI18n } from '@/lib/i18n'
import type { WorkflowMeta } from '@/lib/workflows'
import Link from 'next/link'
import CopyInstall from '@/components/CopyInstall'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import StarRating from '@/components/StarRating'

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

function isDiagramLine(line: string): boolean {
  return /[┌┐└┘│─┬┴├┤▼▲►◄╔╗╚╝║═╠╣╦╩╬┼]/.test(line) || (/^\s{4,}/.test(line) && /[|\\/<>+\-v^]/.test(line))
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

function renderTable(tableLines: string[], startIdx: number) {
  const headerLine = tableLines[0]
  const dataLines = tableLines.slice(2) // skip header + separator
  const headers = parseTableCells(headerLine)

  return (
    <div key={`table-${startIdx}`} className="my-1">
      {/* Line numbers for the table block */}
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

export default function WorkflowDetailContent({ workflows }: { workflows: WorkflowMeta[] }) {
  const { t, lang } = useI18n()

  const workflow = workflows.find(w => w.lang.toUpperCase() === lang) ?? workflows[0]
  const lines = workflow.orchestration.split('\n')
  const totalLines = lines.length
  const totalWords = workflow.orchestration.trim() ? workflow.orchestration.trim().split(/\s+/).length : 0
  const orchestrationFileName = lang === 'ES' ? 'ORQUESTACION.md' : 'ORCHESTRATION.md'
  const installCmd = `curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh | bash -s workflow ${workflow.slug} ${lang}`

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-start justify-between mb-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/soulid-logo.png" alt="Soul ID" style={{ width: 100, height: 100, objectFit: 'contain' }} />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Soul ID</span>
                <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--cyan-bright)' }}>AI AGENTS</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm mb-4 hover:opacity-80 transition-opacity cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/></svg>
            {lang === 'ES' ? 'Volver' : 'Back'}
          </button>

          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              ⚡ {t.tabWorkflows}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {workflow.name}
            </h1>
            {workflow.objective && (
              <p className="max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {workflow.objective}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main: Bundle file viewer */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t.bundleFiles}
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
              <span>📄</span>
              <span style={{ color: 'var(--cyan-bright)' }}>{orchestrationFileName}</span>
              <span style={{ color: 'var(--text-muted)' }}>— {t.workflowOrchestration}</span>
            </div>

            {/* File content */}
            <div className="px-3 py-4 sm:p-6 overflow-x-auto">
              <div className="text-xs sm:text-sm leading-relaxed font-mono" style={{ color: 'var(--text-primary)', minWidth: 0 }}>
                {(() => {
                  const elements: React.ReactNode[] = []
                  let i = 0
                  while (i < lines.length) {
                    // Detect table block
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
                    // Regular line
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
                        <span className={`pl-1 sm:pl-2 ${diagram ? 'whitespace-pre' : 'whitespace-pre-wrap break-words overflow-hidden'}`}>{line ? renderLineMarkdown(line) : ' '}</span>
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

          {/* Install */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t.install}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t.installDesc}
            </p>
            <CopyInstall command={installCmd} />
            <a
              href={`/api/download/${workflow.slug}`}
              download={`${workflow.slug}.tar.gz`}
              className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:brightness-110 active:scale-95"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z"/>
              </svg>
              {t.downloadTar}
            </a>
          </div>

          {/* Star Rating */}
          <StarRating slug={workflow.slug} />

          {/* Includes */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t.includes}</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--cyan-bright)' }}>✓</span> {orchestrationFileName}
              </li>
            </ul>
          </div>

          {/* Info */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t.info}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>Slug</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{workflow.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>{t.linesCount}</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{totalLines}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--text-muted)' }}>{t.wordsCount}</dt>
                <dd style={{ color: 'var(--text-secondary)' }}>{totalWords}</dd>
              </div>
            </dl>
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
              style={{ color: '#e63946' }}
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
