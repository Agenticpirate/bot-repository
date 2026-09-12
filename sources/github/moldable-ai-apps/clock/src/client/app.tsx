import { useQueryClient } from '@tanstack/react-query'
import { AlarmClock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppHeader,
  Button,
  SegmentedControl,
  SegmentedControlItem,
  Toolbar,
  ToolbarActions,
  useMoldableCommands,
  useWorkspace,
} from '@moldable-ai/ui'
import type { UiIntent } from '@/lib/types'
import { useAlarmWatch } from './hooks/use-alarm-watch'
import { useNow } from './hooks/use-now'
import { useTimerWatch } from './hooks/use-timer-watch'
import { AlarmsPane } from './components/alarms'
import { StopwatchPane } from './components/stopwatch'
import { TimersPane } from './components/timers'
import { WorldClockPane } from './components/world-clock'

type Tab = 'clock' | 'alarms' | 'timers' | 'stopwatch'

/** Drive-contract view ids mapped onto the client's tabs. */
const TAB_FOR_VIEW: Record<string, Tab | undefined> = {
  worldclock: 'clock',
  alarms: 'alarms',
  timers: 'timers',
  stopwatch: 'stopwatch',
}

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function LocalTime() {
  const now = useNow(1000)
  const date = useMemo(() => new Date(now), [now])
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold tabular-nums">{time}</span>
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {date.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('clock')
  const [addCity, setAddCity] = useState(0)
  const [addAlarm, setAddAlarm] = useState(0)
  const [addTimer, setAddTimer] = useState(0)
  const { ringing, dismiss } = useAlarmWatch()
  useTimerWatch()

  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const seenIntentIds = useRef<Set<string>>(new Set())

  // Drive contract: fetch the queued navigation intent (single per-workspace
  // slot), apply it visibly by switching tabs, then ack so it never replays.
  const refreshUiIntent = useCallback(async () => {
    try {
      const res = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!res.ok) return
      const intent = (await res.json()) as UiIntent | null
      if (!intent?.id || seenIntentIds.current.has(intent.id)) return
      seenIntentIds.current.add(intent.id)
      setTab(TAB_FOR_VIEW[intent.view] ?? 'clock')
      await fetchWithWorkspace(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
        { method: 'DELETE' },
      )
    } catch {
      // Best-effort: transient failures retry on the next signal.
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    void refreshUiIntent()
  }, [refreshUiIntent])

  // Live updates: chat/app mutations post `moldable:app-api-changed`. React
  // only to events for this app in the active workspace: refetch the queries
  // the method touched, then check for a queued navigation intent.
  useEffect(() => {
    const invalidate = (key: string) =>
      void queryClient.invalidateQueries({ queryKey: [key, workspaceId] })
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            type?: string
            targetAppId?: string
            workspaceId?: string
            method?: string
          }
        | null
        | undefined
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'clock') return
      if (data.workspaceId && data.workspaceId !== workspaceId) return
      const method = (data.method ?? '').replace(/^clock\./, '')
      if (!method.startsWith('ui.')) {
        if (method.startsWith('timers.')) invalidate('timers')
        else if (method.startsWith('alarms.')) invalidate('alarms')
        else if (method.startsWith('worldclocks.')) invalidate('worldclocks')
        else {
          // Unknown method: refresh every workspace-scoped query.
          invalidate('timers')
          invalidate('alarms')
          invalidate('worldclocks')
          invalidate('stopwatch')
        }
      }
      void refreshUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, workspaceId, refreshUiIntent])

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: `User is in the Clock app on the ${tab} tab. To read or change alarms, timers, or world clocks, prefer the Clock app RPC methods (timers.*, alarms.*, worldclocks.*) over guessing.`,
      },
      '*',
    )
  }, [tab])

  useMoldableCommands({
    'clock:world': () => setTab('clock'),
    'clock:alarms': () => setTab('alarms'),
    'clock:timers': () => setTab('timers'),
    'clock:stopwatch': () => setTab('stopwatch'),
    'clock:add-city': () => {
      setTab('clock')
      setAddCity((n) => n + 1)
    },
    'clock:add-alarm': () => {
      setTab('alarms')
      setAddAlarm((n) => n + 1)
    },
    'clock:add-timer': () => {
      setTab('timers')
      setAddTimer((n) => n + 1)
    },
  })

  return (
    <div className="clock-app text-foreground flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <AppHeader
        title="Clock"
        desktop={
          <Toolbar
            position="top"
            variant="plain"
            material="none"
            density="default"
            className="grid shrink-0 grid-cols-[1fr_auto_1fr]"
          >
            <div className="text-muted-foreground hidden min-w-0 sm:block">
              <span className="truncate text-xs">
                {LOCAL_ZONE.replace(/_/g, ' ')}
              </span>
            </div>
            <SegmentedControl
              aria-label="Clock mode"
              value={tab}
              onValueChange={(value) => setTab(value as Tab)}
              density="compact"
              className="col-start-2"
            >
              <SegmentedControlItem value="clock">
                World Clock
              </SegmentedControlItem>
              <SegmentedControlItem value="alarms">Alarms</SegmentedControlItem>
              <SegmentedControlItem value="timers">Timers</SegmentedControlItem>
              <SegmentedControlItem value="stopwatch">
                Stopwatch
              </SegmentedControlItem>
            </SegmentedControl>
            <ToolbarActions className="col-start-3">
              <LocalTime />
            </ToolbarActions>
          </Toolbar>
        }
        mobileControls={
          <SegmentedControl
            aria-label="Clock mode"
            value={tab}
            onValueChange={(value) => setTab(value as Tab)}
            density="compact"
          >
            <SegmentedControlItem value="clock">World</SegmentedControlItem>
            <SegmentedControlItem value="alarms">Alarms</SegmentedControlItem>
            <SegmentedControlItem value="timers">Timers</SegmentedControlItem>
            <SegmentedControlItem value="stopwatch">
              Stopwatch
            </SegmentedControlItem>
          </SegmentedControl>
        }
      />

      <div className="clock-content min-h-0 flex-1 overflow-hidden">
        {tab === 'clock' && <WorldClockPane openAddSignal={addCity} />}
        {tab === 'alarms' && <AlarmsPane openAddSignal={addAlarm} />}
        {tab === 'timers' && <TimersPane openAddSignal={addTimer} />}
        {tab === 'stopwatch' && <StopwatchPane />}
      </div>

      {ringing.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
          role="alert"
        >
          {ringing.map((alarm) => (
            <div
              key={alarm.id}
              className="bg-card pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border px-4 py-2.5 shadow-xl"
            >
              <AlarmClock className="text-primary clock-ring size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {alarm.label || 'Alarm'}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {alarm.time}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 cursor-pointer rounded-full"
                onClick={() => dismiss(alarm.id)}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
