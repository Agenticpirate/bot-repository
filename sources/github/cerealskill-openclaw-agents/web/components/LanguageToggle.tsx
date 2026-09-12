'use client'

import { useI18n } from '@/lib/i18n'

export default function LanguageToggle() {
  const { lang, setLang } = useI18n()

  const toggle = () => setLang(lang === 'EN' ? 'ES' : 'EN')

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg transition-all duration-200 text-sm font-bold"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
      title={lang === 'EN' ? 'Cambiar a español' : 'Switch to English'}
    >
      {lang === 'EN' ? '🇪🇸 ES' : '🇺🇸 EN'}
    </button>
  )
}
