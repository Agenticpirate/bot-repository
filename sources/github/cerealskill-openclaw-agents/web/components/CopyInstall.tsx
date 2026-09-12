'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

export default function CopyInstall({ command }: { command: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div
        className="rounded-xl p-4 mb-3 overflow-x-auto"
        style={{ background: '#0d1117', border: '1px solid #30363d' }}
      >
        <code
          className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed"
          style={{ color: '#3fb950' }}
        >
          {command}
        </code>
      </div>
      <button
        onClick={handleCopy}
        className="install-btn-fx w-full text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:brightness-110 active:scale-95"
        style={{
          background: copied ? '#1a7f37' : '#e63946',
        }}
      >
        {copied ? t.copied : t.deployBtn}
      </button>
    </div>
  )
}
