import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <img src="/soulid-logo.png" alt="Soul ID logo" className="shrink-0" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>Soul ID</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--cyan-bright)' }}>Privacy</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs sm:text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              ← Volver
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-5xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Last updated: March 2026</p>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>🔒 Your data stays yours</h2>
            <p>
              No analizamos ni entrenamos sobre el contenido de tus bundles. Tus archivos se almacenan y recuperan tal cual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>🔑 About API keys & sensitive data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>El acceso requiere autenticación válida.</li>
              <li>No inspeccionamos ni indexamos el contenido de backups.</li>
              <li>El tráfico se protege por HTTPS/TLS.</li>
              <li>Recomendamos no guardar secretos en texto plano.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>☁️ Data storage</h2>
            <p>
              Los respaldos se almacenan en infraestructura cloud segura. Puedes eliminarlos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>📊 What we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Correo de cuenta para autenticación.</li>
              <li>Métricas básicas de uso para límites operativos.</li>
              <li>Claves/API solo para validación segura cuando aplica.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>✉️ Contact</h2>
            <p>
              Si tienes dudas de privacidad, contáctanos en: <a href="mailto:privacy@Soul ID.ai" style={{ color: 'var(--cyan-bright)' }}>privacy@Soul ID.ai</a>
            </p>
          </section>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p className="mb-3">
            <a href="/" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Finder</a>
            {' '}·{' '}
            <a href="/docs" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Docs</a>
            {' '}·{' '}
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80 transition-opacity">Privacy</a>
          </p>
          <p>
            © 2026 Soul ID - Built for{' '}
            <a href="https://openclaw.ai" style={{ color: '#e63946' }} className="hover:opacity-80 transition-opacity">
              OpenClaw
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}
