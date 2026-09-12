'use client'

import { useI18n } from '@/lib/i18n'
import { CATEGORY_ICONS, BUNDLE_FILES } from '@/lib/agents-types'
import type { AgentMeta } from '@/lib/agents-types'
import Link from 'next/link'
import CopyInstall from '@/components/CopyInstall'
import FileTabs from '@/components/FileTabs'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import StarRating from '@/components/StarRating'

export default function AgentDetailContent({ agents }: { agents: AgentMeta[] }) {
  const { t, lang } = useI18n()

  // Pick the agent matching current language, fallback to first available
  const agent = agents.find(a => (a.lang ?? 'EN').toUpperCase() === lang) ?? agents[0]

  const installCmd = `curl -fsSL https://raw.githubusercontent.com/cerealskill/openclaw-agents/main/install.sh | bash -s agent ${agent.slug} ${lang}`

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

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm capitalize mb-1" style={{ color: 'var(--text-muted)' }}>
                {CATEGORY_ICONS[agent.category]} {agent.category}
                {agent.subcategory && ` / ${agent.subcategory}`}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {agent.name}
              </h1>
              <p className="max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {agent.description}
              </p>
            </div>
            <span
              className="text-sm px-3 py-1 rounded-full self-start shrink-0"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--cyan-mid)',
                border: '1px solid var(--border)',
              }}
            >
              {agent.model}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {agent.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded"
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

          {agent.soul_id && (
            <div className="mt-4">
              <a
                href={`https://registry.soulid.io/resolve/${agent.soul_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-opacity hover:opacity-80"
                style={{
                  background: 'rgba(167, 139, 250, 0.08)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  color: '#a78bfa',
                }}
              >
                <span>⚡</span>
                <span>{agent.soul_id}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main: File browser */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t.bundleFiles}
          </h2>
          <FileTabs files={agent.files} />
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
              href={`/api/download/${agent.slug}`}
              download={`${agent.slug}.tar.gz`}
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

          {/* Multi-runtime download */}
          {agent.soul_id && (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {lang === 'ES' ? 'Descargar para otro runtime' : 'Download for runtime'}
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {lang === 'ES'
                  ? 'Genera el archivo de identidad para tu herramienta preferida'
                  : 'Generate the identity file for your preferred tool'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'openclaw',    label: 'OpenClaw',    file: 'SOUL.md',         icon: '🦞' },
                  { id: 'codex',       label: 'Codex CLI',   file: 'AGENTS.md',       icon: '🤖' },
                  { id: 'claude-code', label: 'Claude Code', file: 'CLAUDE.md',       icon: '🟣' },
                  { id: 'gemini-cli',  label: 'Gemini CLI',  file: 'GEMINI.md',       icon: '🔵' },
                  { id: 'aider',       label: 'Aider',       file: 'CONVENTIONS.md',  icon: '⚙️' },
                  { id: 'continue',    label: 'Continue',    file: '.continuerules',  icon: '▶️' },
                  { id: 'cursor',      label: 'Cursor',      file: '.cursorrules',    icon: '🎯' },
                  { id: 'raw',         label: 'soul.json',   file: 'soul.json',       icon: '📄' },
                ].map(({ id, label, file, icon }) => (
                  <a
                    key={id}
                    href={`https://registry.soulid.io/download/${agent.soul_id}?runtime=${id}`}
                    download={file}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] hover:brightness-110"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </a>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                {lang === 'ES' ? 'Powered by ' : 'Powered by '}
                <a href="https://soulid.io" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#a78bfa' }}>soulid.io</a>
              </p>
            </div>
          )}

          {/* Star Rating */}
          <StarRating slug={agent.slug} />

          {/* Bundle includes */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t.includes}</h3>
            <ul className="space-y-1.5">
              {BUNDLE_FILES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--cyan-bright)' }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Meta */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t.info}</h3>
            <dl className="space-y-2 text-sm">
              {([
                [t.author, agent.author],
                [t.version, agent.version],
                [t.model, agent.model],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                  <dd style={{ color: 'var(--text-secondary)' }}>{value}</dd>
                </div>
              ))}
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
