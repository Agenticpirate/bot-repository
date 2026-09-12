'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'

export default function AuthButton() {
  const { t } = useI18n()
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div
        className="w-8 h-8 rounded-full animate-pulse"
        style={{ background: 'var(--bg-elevated)' }}
      />
    )
  }

  if (session?.user) {
    return (
      <div className="relative group flex items-center">
        <button
          onClick={() => signOut()}
          className="relative flex items-center justify-center rounded-full overflow-hidden transition-all user-heartbeat"
          style={{ width: 34, height: 34, border: '2px solid var(--user-circle)' }}
          title={`${session.user.name} · Click to sign out`}
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ''}
              width={34}
              height={34}
              className="rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--cyan-bright)' }}>
              {session.user.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          {/* Hover overlay */}
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(10,15,26,0.75)', color: '#ffffff' }}
          >
            {t.signOut}
          </span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 hover:scale-[1.01] hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: 'var(--google-signin-bg)',
        color: 'var(--btn-text)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {t.signInGoogle}
    </button>
  )
}
