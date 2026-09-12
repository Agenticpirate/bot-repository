import {
  Check,
  ChevronDown,
  ExternalLink,
  LockKeyhole,
  RefreshCcw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppHeader, Button, Input, cn } from '@moldable-ai/ui'
import { useConnectBrowser, useStartOAuth } from '../hooks/use-bookmarks'
import type { BrowserProfile } from '../../shared/bookmarks'

interface ConnectScreenProps {
  profiles: BrowserProfile[]
  loadingProfiles: boolean
  onRescan: () => void
}

export function ConnectScreen({
  profiles,
  loadingProfiles,
  onRescan,
}: ConnectScreenProps) {
  const available = useMemo(
    () => profiles.filter((profile) => profile.hasXSession),
    [profiles],
  )
  const [selected, setSelected] = useState(() => profileKey(available[0]))
  const [showOAuth, setShowOAuth] = useState(false)
  const [clientId, setClientId] = useState('')
  const connect = useConnectBrowser()
  const oauth = useStartOAuth()

  const chosen =
    available.find((profile) => profileKey(profile) === selected) ??
    available[0]
  const error = connect.error ?? oauth.error

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <AppHeader title="Bookmarks" desktop={false} />
      <main className="mx-auto flex min-h-full w-full max-w-lg items-center px-6 py-12">
        <section className="w-full">
          <div className="mb-8">
            <img
              src="/icon.png"
              alt=""
              className="mb-5 size-14 rounded-2xl shadow-sm"
            />
            <h1 className="text-2xl font-semibold tracking-tight">Connect X</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Choose the browser profile where you’re signed in.
            </p>
          </div>

          <div className="border-border/70 bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl border p-2">
            {available.length ? (
              <div className="space-y-1">
                {available.map((profile) => {
                  const active = profileKey(profile) === profileKey(chosen)
                  return (
                    <button
                      key={profileKey(profile)}
                      type="button"
                      className={cn(
                        'hover:bg-muted/70 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                        active && 'bg-muted',
                      )}
                      onClick={() => setSelected(profileKey(profile))}
                    >
                      <div className="bg-background/80 border-border flex size-9 items-center justify-center rounded-lg border text-sm font-semibold">
                        {profile.browserName.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {profile.browserName}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {profile.profileName} · signed in to X
                        </div>
                      </div>
                      {active ? (
                        <Check className="text-primary size-4" />
                      ) : null}
                    </button>
                  )
                })}
                <Button
                  type="button"
                  className="mt-2 w-full cursor-pointer"
                  disabled={!chosen || connect.isPending}
                  onClick={() =>
                    chosen &&
                    connect.mutate({
                      browserId: chosen.browserId,
                      profileId: chosen.profileId,
                    })
                  }
                >
                  <LockKeyhole className="size-4" />
                  {connect.isPending
                    ? 'Connecting…'
                    : 'Use this browser session'}
                </Button>
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-sm font-medium">
                  No signed-in X session found
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Sign in at x.com in your browser, then scan again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 cursor-pointer"
                  onClick={onRescan}
                  disabled={loadingProfiles}
                >
                  <RefreshCcw
                    className={cn('size-4', loadingProfiles && 'animate-spin')}
                  />
                  Scan browsers
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl px-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between py-2 text-xs"
              onClick={() => setShowOAuth((value) => !value)}
            >
              <span>Advanced: official X API OAuth (usage fees apply)</span>
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform',
                  showOAuth && 'rotate-180',
                )}
              />
            </button>
            {showOAuth ? (
              <form
                className="border-border mt-2 space-y-3 rounded-xl border p-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  oauth.mutate(clientId, {
                    onSuccess: ({ authorizeUrl }) =>
                      window.location.assign(authorizeUrl),
                  })
                }}
              >
                <p className="text-muted-foreground text-xs leading-5">
                  Requires your own X developer app. X currently prices your own
                  bookmark reads at $0.001 per returned post.
                </p>
                <Input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="X OAuth client ID"
                  aria-label="X OAuth client ID"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={clientId.trim().length < 3 || oauth.isPending}
                >
                  <ExternalLink className="size-4" />
                  Continue with OAuth
                </Button>
                {oauth.data?.redirectUri ? (
                  <p className="text-muted-foreground break-all text-[11px]">
                    Register this callback: {oauth.data.redirectUri}
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>

          <p className="text-muted-foreground mt-5 text-sm">
            Read-only. Your bookmarks stay on this Mac.
          </p>
          {error ? (
            <p
              role="alert"
              className="text-destructive mt-3 text-center text-xs"
            >
              {error.message}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function profileKey(profile?: BrowserProfile): string {
  return profile ? `${profile.browserId}:${profile.profileId}` : ''
}
