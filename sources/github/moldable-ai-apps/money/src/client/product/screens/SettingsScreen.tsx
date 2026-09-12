import { ChevronRight, Landmark, RotateCcw, Tags } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  useMoldableNavigationPop,
} from '@moldable-ai/ui'
import { timeAgo } from '../../ui-kit/lib/format'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import { DemoBadge } from '../components/ConnectBanner'
import { CategorySettingsView } from '../components/categories/CategorySettingsView'
import { MicroLabel } from '../../ui-kit/cards/atoms'
import {
  type SyncModel,
  useSyncSettings,
  useUpdateSyncSettings,
} from '../data-access/accounts'
import { useSetDataMode } from '../data-access/hooks'

const INTERVALS: Array<{ value: string; label: string }> = [
  { value: '60', label: 'Every hour' },
  { value: '360', label: 'Every 6 hours' },
  { value: '720', label: 'Every 12 hours' },
  { value: '1440', label: 'Once a day' },
]

/** Settings: sync schedule, data status, and onboarding controls. */
export function SettingsScreen({
  demoMode,
  liveAvailable,
  onConnect,
  onReplayOnboarding,
  sync,
}: {
  demoMode: boolean
  liveAvailable: boolean
  onConnect?: () => void
  onReplayOnboarding?: () => void
  sync?: SyncModel
}) {
  const [view, setView] = useState<'root' | 'categories'>('root')
  const categoryViewOpen = useRef(false)
  const settingsQuery = useSyncSettings()
  const updateSettings = useUpdateSyncSettings()
  const setDataMode = useSetDataMode()
  const schedule = settingsQuery.data?.settings.sync
  const autoEnabled = schedule?.scheduledRefreshEnabled ?? false
  const interval = String(schedule?.intervalMinutes ?? 360)
  // Source the last-synced time from the shared poller so Settings never
  // disagrees with the rail / Accounts.
  const lastSync = sync?.lastSyncAt
  const syncBusy = Boolean(sync?.busy)

  const openCategories = () => {
    categoryViewOpen.current = true
    pushMoldableNavigation({
      id: 'settings-categories',
      title: 'Categories',
    })
    setView('categories')
  }

  const closeCategories = () => {
    categoryViewOpen.current = false
    popMoldableNavigation('settings-categories')
    setView('root')
  }

  useMoldableNavigationPop((message) => {
    if (
      message.entry?.id === 'settings-categories' ||
      categoryViewOpen.current
    ) {
      categoryViewOpen.current = false
      setView('root')
    }
  })

  useEffect(
    () => () => {
      if (categoryViewOpen.current) {
        popMoldableNavigation('settings-categories')
      }
    },
    [],
  )

  if (view === 'categories') {
    return <CategorySettingsView demoMode={demoMode} onBack={closeCategories} />
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Data, syncing, and your setup.
        </p>
      </div>

      <div className="space-y-6">
        <Section title="Data">
          <Row
            label="Demo mode"
            hint={
              demoMode
                ? liveAvailable
                  ? 'Show sample money and hide connected account data.'
                  : 'Sample money stays on until you connect an account.'
                : 'Show cards and dashboards from connected accounts.'
            }
          >
            <Switch
              className="!min-h-[var(--m-ui-switch-track-height)]"
              aria-label="Show demo money instead of connected account data"
              checked={demoMode}
              onCheckedChange={(checked) => {
                if (!checked && !liveAvailable) return
                setDataMode.mutate(checked ? 'demo' : 'live')
              }}
              disabled={
                settingsQuery.isLoading ||
                setDataMode.isPending ||
                (!liveAvailable && demoMode)
              }
            />
          </Row>
          <Row
            label={demoMode ? 'Sample data' : 'Live data'}
            hint={
              demoMode
                ? 'Sample cards are safe to show in demos.'
                : 'Live mode uses your connected accounts.'
            }
          >
            {demoMode ? (
              <DemoBadge />
            ) : (
              <Badge variant="secondary" className="uppercase tracking-wide">
                Live
              </Badge>
            )}
          </Row>
          {demoMode ? (
            <Row
              label="Connect accounts"
              hint="Link banks without leaving demo mode."
            >
              <Button size="sm" onClick={onConnect} className="cursor-pointer">
                <Landmark className="size-3.5" />
                Connect
              </Button>
            </Row>
          ) : null}
          {setDataMode.isError ? (
            <div className="text-destructive px-4 py-3 text-xs">
              {(setDataMode.error as Error).message}
            </div>
          ) : null}
        </Section>

        {!demoMode ? (
          <Section title="Categories">
            <button
              type="button"
              onClick={openCategories}
              className={cn(
                'hover:bg-muted/40 flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                FOCUS_RING,
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Tags className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Manage categories
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    Rename, hide, merge, emoji, and auto-tagging rules.
                  </span>
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          </Section>
        ) : null}

        {!demoMode ? (
          <Section title="Syncing">
            <Row
              label="Auto-refresh"
              hint="Pull new transactions on a schedule."
            >
              <Switch
                className="!min-h-[var(--m-ui-switch-track-height)]"
                aria-label="Auto-refresh transactions on a schedule"
                checked={autoEnabled}
                onCheckedChange={(v) =>
                  updateSettings.mutate({ scheduledRefreshEnabled: v })
                }
                disabled={settingsQuery.isLoading || updateSettings.isPending}
              />
            </Row>
            {autoEnabled ? (
              <Row label="Frequency">
                <Select
                  value={interval}
                  onValueChange={(v) =>
                    updateSettings.mutate({ intervalMinutes: Number(v) })
                  }
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            ) : null}
            <Row
              label="Last synced"
              hint={syncBusy ? (sync?.label ?? 'Syncing…') : timeAgo(lastSync)}
            />
          </Section>
        ) : null}

        <Section title="Setup">
          <Row label="Onboarding" hint="See the dashboard install flow again.">
            <Button
              variant="outline"
              size="sm"
              onClick={onReplayOnboarding}
              className="cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Restart
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <MicroLabel className="mb-2">{title}</MicroLabel>
      <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-xl border">
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? (
          <div className="text-muted-foreground truncate text-xs">{hint}</div>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}
