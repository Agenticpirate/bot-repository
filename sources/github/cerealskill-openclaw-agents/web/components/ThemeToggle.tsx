'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

export default function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg transition-all duration-200"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
      title={theme === 'dark' ? t.switchLight : t.switchDark}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
