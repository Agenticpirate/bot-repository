import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { isOneShotAlarmExpired, nextAlarmOccurrenceAfter } from '@/lib/alarms'
import {
  formatDuration,
  formatRelative,
  formatStopwatch,
  repeatLabel,
  zoneDeltaLabel,
  zoneOffsetLabel,
} from '@/lib/format'
import { COMMON_ZONES, allZones, zoneToLabel } from '@/lib/timezones'
import {
  type Alarm,
  DEFAULT_STOPWATCH,
  type StopwatchState,
  type Timer,
  type TimerView,
  UI_VIEW_IDS,
  type UiIntent,
  type UiViewId,
  type Weekday,
  type WorldClock,
} from '@/lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function normalizeWorkspaceId(value: string | null | undefined) {
  if (!value) return undefined
  try {
    return sanitizeId(value)
  } catch {
    return undefined
  }
}

function getRequestWorkspaceId(request: Request) {
  return normalizeWorkspaceId(
    getWorkspaceFromRequest(request) ??
      request.headers.get('x-moldable-workspace-id'),
  )
}

function alarmsPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'alarms.json')
}

function timersPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'timers.json')
}

function stopwatchPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'stopwatch.json')
}

function worldClocksPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'world-clocks.json')
}

async function readAlarms(workspaceId?: string) {
  const alarms = await readJson<Alarm[]>(alarmsPath(workspaceId), [])
  const now = new Date()
  let changed = false
  const settled = alarms.map((alarm) => {
    if (
      alarm.enabled &&
      alarm.repeat.length === 0 &&
      isOneShotAlarmExpired(alarm, now, 5 * 60_000)
    ) {
      changed = true
      return { ...alarm, enabled: false }
    }
    return alarm
  })
  if (changed) await writeAlarms(settled, workspaceId)
  return settled
}

function writeAlarms(alarms: Alarm[], workspaceId?: string) {
  return writeJson(alarmsPath(workspaceId), alarms)
}

function readTimers(workspaceId?: string) {
  return readJson<Timer[]>(timersPath(workspaceId), [])
}

function writeTimers(timers: Timer[], workspaceId?: string) {
  return writeJson(timersPath(workspaceId), timers)
}

async function readStopwatch(workspaceId?: string) {
  const state = await readJson<StopwatchState>(
    stopwatchPath(workspaceId),
    DEFAULT_STOPWATCH,
  )
  return { ...DEFAULT_STOPWATCH, ...state }
}

function writeStopwatch(state: StopwatchState, workspaceId?: string) {
  return writeJson(stopwatchPath(workspaceId), state)
}

function readWorldClocks(workspaceId?: string) {
  return readJson<WorldClock[]>(worldClocksPath(workspaceId), [])
}

function writeWorldClocks(clocks: WorldClock[], workspaceId?: string) {
  return writeJson(worldClocksPath(workspaceId), clocks)
}

// ---------------------------------------------------------------------------
// UI intents (drive contract) — a single per-workspace slot the client polls
// ---------------------------------------------------------------------------

function uiIntentPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function readUiIntent(workspaceId?: string) {
  return readJson<UiIntent | null>(uiIntentPath(workspaceId), null)
}

function writeUiIntent(intent: UiIntent | null, workspaceId?: string) {
  return writeJson(uiIntentPath(workspaceId), intent)
}

/** Queue a navigation intent. Single slot: the newest replaces any unacked one. */
async function setUiIntent(
  input: {
    view: UiViewId
    entityId?: string
    params?: Record<string, unknown>
  },
  workspaceId?: string,
): Promise<UiIntent> {
  const intent: UiIntent = {
    id: crypto.randomUUID(),
    view: input.view,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.params && Object.keys(input.params).length > 0
      ? { params: input.params }
      : {}),
    createdAt: new Date().toISOString(),
  }
  await writeUiIntent(intent, workspaceId)
  return intent
}

/** Model-readable catalog of every navigable surface in the client UI. */
const UI_VIEWS: {
  id: UiViewId
  name: string
  description: string
  params?: Record<string, string>
}[] = [
  {
    id: 'worldclock',
    name: 'World Clock',
    description:
      'The tab the app opens on: the current local time plus a card for every saved world clock showing its city label, current local time, UTC offset, and the hour delta from here. Takes no entityId and no params.',
  },
  {
    id: 'alarms',
    name: 'Alarms',
    description:
      'The list of alarms with their time of day, label, repeat weekdays, and an enable/disable switch for each. Optional entityId: an alarm id (from clock.alarms.list) to point the user at a specific alarm.',
  },
  {
    id: 'timers',
    name: 'Timers',
    description:
      'The countdown timers: each shows a circular progress ring, its label, remaining time, and start/pause/reset controls. Optional entityId: a timer id (from clock.timers.list or clock.timers.start) to point the user at a specific timer.',
  },
  {
    id: 'stopwatch',
    name: 'Stopwatch',
    description:
      'The single stopwatch with elapsed time, lap list, and start/stop/lap/reset controls. Takes no entityId and no params.',
  },
]

// ---------------------------------------------------------------------------
// Drive contract schemas
// ---------------------------------------------------------------------------

const uiDescribeParamsSchema = z.object({}).optional()

const uiNavigateParamsSchema = z
  .object({
    view: z.enum(UI_VIEW_IDS),
    entityId: z.string().min(1).optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.view === 'stopwatch' && value.entityId) {
      ctx.addIssue({
        code: 'custom',
        path: ['entityId'],
        message: 'The stopwatch view has no entities; omit entityId.',
      })
    }
    if (value.view === 'worldclock' && value.entityId) {
      ctx.addIssue({
        code: 'custom',
        path: ['entityId'],
        message: 'The worldclock view takes no entityId; omit it.',
      })
    }
  })

const uiReadParamsSchema = z
  .object({
    view: z.enum(UI_VIEW_IDS).optional(),
    entityId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.entityId && value.view !== 'timers' && value.view !== 'alarms') {
      ctx.addIssue({
        code: 'custom',
        path: ['entityId'],
        message:
          'entityId is only valid with view "timers" (a timer id) or "alarms" (an alarm id).',
      })
    }
  })
  .optional()

const timersStartParamsSchema = z.object({
  minutes: z
    .number()
    .positive()
    .refine((minutes) => Math.round(minutes * 60_000) >= 1000, {
      message: 'minutes must amount to at least one second.',
    }),
  label: z.string().optional(),
})

const timersCancelParamsSchema = z.object({
  timerId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

function viewTimer(timer: Timer, now: number): TimerView {
  if (timer.running && timer.endsAt) {
    const remaining = Date.parse(timer.endsAt) - now
    if (remaining <= 0) {
      return { ...timer, state: 'finished', currentRemainingMs: 0 }
    }
    return { ...timer, state: 'running', currentRemainingMs: remaining }
  }
  if (timer.remainingMs <= 0) {
    return { ...timer, state: 'finished', currentRemainingMs: 0 }
  }
  if (timer.remainingMs >= timer.durationMs) {
    return { ...timer, state: 'idle', currentRemainingMs: timer.durationMs }
  }
  return { ...timer, state: 'paused', currentRemainingMs: timer.remainingMs }
}

function remainingNow(timer: Timer, now: number): number {
  if (timer.running && timer.endsAt) {
    return Math.max(0, Date.parse(timer.endsAt) - now)
  }
  return Math.max(0, timer.remainingMs)
}

function startTimer(timer: Timer, now: number): Timer {
  let remaining = remainingNow(timer, now)
  if (remaining <= 0) remaining = timer.durationMs
  return {
    ...timer,
    running: true,
    endsAt: new Date(now + remaining).toISOString(),
    remainingMs: remaining,
  }
}

function pauseTimer(timer: Timer, now: number): Timer {
  const remaining = remainingNow(timer, now)
  return { ...timer, running: false, endsAt: null, remainingMs: remaining }
}

function resetTimer(timer: Timer): Timer {
  return {
    ...timer,
    running: false,
    endsAt: null,
    remainingMs: timer.durationMs,
  }
}

function elapsedStopwatch(state: StopwatchState, now: number): number {
  return state.running && state.startedAt
    ? state.accumulatedMs + Math.max(0, now - Date.parse(state.startedAt))
    : state.accumulatedMs
}

function normalizeTime(time: unknown): string | null {
  if (typeof time !== 'string') return null
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeRepeat(repeat: unknown): Weekday[] {
  if (!Array.isArray(repeat)) return []
  const days = new Set<Weekday>()
  for (const value of repeat) {
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 6
    ) {
      days.add(value as Weekday)
    }
  }
  return [...days].sort((a, b) => a - b)
}

function nextAlarmFire(alarm: Alarm, from: Date): Date | null {
  return nextAlarmOccurrenceAfter(alarm, from)
}

function nextAlarm(alarms: Alarm[], now: Date) {
  let best: { alarm: Alarm; fireAt: Date } | null = null
  for (const alarm of alarms) {
    if (!alarm.enabled) continue
    const fireAt = nextAlarmFire(alarm, now)
    if (!fireAt) continue
    if (!best || fireAt.getTime() < best.fireAt.getTime()) {
      best = { alarm, fireAt }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'clock',
      port: portRaw ? Number(portRaw) : null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

// ---------------------------------------------------------------------------
// Cmd+K commands
// ---------------------------------------------------------------------------

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'clock:add-alarm',
        label: 'New alarm',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:add-timer',
        label: 'New timer',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:add-city',
        label: 'Add city to world clock',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:stopwatch',
        label: 'Open stopwatch',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:world',
        label: 'Open world clock',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:alarms',
        label: 'Open alarms',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:timers',
        label: 'Open timers',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
    ],
  })
})

// ---------------------------------------------------------------------------
// Alarms HTTP API
// ---------------------------------------------------------------------------

app.get('/api/alarms', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  return c.json({ alarms: await readAlarms(workspaceId) })
})

app.post('/api/alarms', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const time = normalizeTime(body.time)
  if (!time) return c.json({ error: 'A valid HH:mm time is required.' }, 400)

  const alarm: Alarm = {
    id: crypto.randomUUID(),
    label: typeof body.label === 'string' ? body.label : '',
    time,
    enabled: body.enabled !== false,
    repeat: normalizeRepeat(body.repeat),
    createdAt: new Date().toISOString(),
  }
  const alarms = await readAlarms(workspaceId)
  await writeAlarms([...alarms, alarm], workspaceId)
  return c.json({ alarm })
})

app.patch('/api/alarms/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const alarms = await readAlarms(workspaceId)
  const index = alarms.findIndex((a) => a.id === id)
  if (index === -1) return c.json({ error: 'Alarm not found.' }, 404)

  const current = alarms[index]!
  const time = body.time === undefined ? current.time : normalizeTime(body.time)
  if (!time) return c.json({ error: 'A valid HH:mm time is required.' }, 400)

  alarms[index] = {
    ...current,
    time,
    label: typeof body.label === 'string' ? body.label : current.label,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
    repeat:
      body.repeat === undefined ? current.repeat : normalizeRepeat(body.repeat),
  }
  await writeAlarms(alarms, workspaceId)
  return c.json({ alarm: alarms[index] })
})

app.delete('/api/alarms/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const alarms = await readAlarms(workspaceId)
  const filtered = alarms.filter((a) => a.id !== id)
  if (filtered.length === alarms.length) {
    return c.json({ error: 'Alarm not found.' }, 404)
  }
  await writeAlarms(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Timers HTTP API
// ---------------------------------------------------------------------------

app.get('/api/timers', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const now = Date.now()
  const timers = await readTimers(workspaceId)
  return c.json({
    timers: timers.map((t) => viewTimer(t, now)),
    serverNow: new Date(now).toISOString(),
  })
})

app.post('/api/timers', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const durationMs = Number(body.durationMs)
  if (!Number.isFinite(durationMs) || durationMs < 1000) {
    return c.json({ error: 'durationMs must be at least 1000.' }, 400)
  }

  const now = Date.now()
  const base: Timer = {
    id: crypto.randomUUID(),
    label: typeof body.label === 'string' ? body.label : '',
    durationMs: Math.round(durationMs),
    endsAt: null,
    remainingMs: Math.round(durationMs),
    running: false,
    createdAt: new Date(now).toISOString(),
  }
  const timer = body.start ? startTimer(base, now) : base
  const timers = await readTimers(workspaceId)
  await writeTimers([...timers, timer], workspaceId)
  return c.json({ timer: viewTimer(timer, now) })
})

async function mutateTimer(
  workspaceId: string | undefined,
  id: string,
  mutate: (timer: Timer, now: number) => Timer,
): Promise<TimerView | null> {
  const now = Date.now()
  const timers = await readTimers(workspaceId)
  const index = timers.findIndex((t) => t.id === id)
  if (index === -1) return null
  timers[index] = mutate(timers[index]!, now)
  await writeTimers(timers, workspaceId)
  return viewTimer(timers[index]!, now)
}

app.post('/api/timers/:id/:action', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const action = c.req.param('action')
  const mutator =
    action === 'start'
      ? startTimer
      : action === 'pause'
        ? pauseTimer
        : action === 'reset'
          ? (timer: Timer) => resetTimer(timer)
          : null
  if (!mutator) return c.json({ error: `Unknown action ${action}.` }, 400)

  const timer = await mutateTimer(workspaceId, id, mutator)
  if (!timer) return c.json({ error: 'Timer not found.' }, 404)
  return c.json({ timer })
})

app.delete('/api/timers/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const timers = await readTimers(workspaceId)
  const filtered = timers.filter((t) => t.id !== id)
  if (filtered.length === timers.length) {
    return c.json({ error: 'Timer not found.' }, 404)
  }
  await writeTimers(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Stopwatch HTTP API
// ---------------------------------------------------------------------------

app.get('/api/stopwatch', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  return c.json({
    stopwatch: await readStopwatch(workspaceId),
    serverNow: new Date().toISOString(),
  })
})

app.post('/api/stopwatch/:action', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const action = c.req.param('action')
  const now = Date.now()
  const state = await readStopwatch(workspaceId)

  let next: StopwatchState = state
  if (action === 'start') {
    next = state.running
      ? state
      : { ...state, running: true, startedAt: new Date(now).toISOString() }
  } else if (action === 'stop') {
    next = state.running
      ? {
          ...state,
          running: false,
          startedAt: null,
          accumulatedMs: elapsedStopwatch(state, now),
        }
      : state
  } else if (action === 'lap') {
    next = state.running
      ? { ...state, laps: [...state.laps, elapsedStopwatch(state, now)] }
      : state
  } else if (action === 'reset') {
    next = { ...DEFAULT_STOPWATCH }
  } else {
    return c.json({ error: `Unknown action ${action}.` }, 400)
  }

  await writeStopwatch(next, workspaceId)
  return c.json({ stopwatch: next, serverNow: new Date(now).toISOString() })
})

// ---------------------------------------------------------------------------
// World clocks HTTP API
// ---------------------------------------------------------------------------

app.get('/api/worldclocks', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  return c.json({ worldClocks: await readWorldClocks(workspaceId) })
})

app.post('/api/worldclocks', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const timeZone = typeof body.timeZone === 'string' ? body.timeZone : ''
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    return c.json({ error: 'Unknown time zone.' }, 400)
  }

  const clock: WorldClock = {
    id: crypto.randomUUID(),
    label:
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim()
        : zoneToLabel(timeZone),
    timeZone,
    createdAt: new Date().toISOString(),
  }
  const clocks = await readWorldClocks(workspaceId)
  if (clocks.some((existing) => existing.timeZone === timeZone)) {
    return c.json({ worldClock: clocks.find((x) => x.timeZone === timeZone) })
  }
  await writeWorldClocks([...clocks, clock], workspaceId)
  return c.json({ worldClock: clock })
})

app.delete('/api/worldclocks/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const clocks = await readWorldClocks(workspaceId)
  const filtered = clocks.filter((x) => x.id !== id)
  if (filtered.length === clocks.length) {
    return c.json({ error: 'World clock not found.' }, 404)
  }
  await writeWorldClocks(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Today contribution
// ---------------------------------------------------------------------------

app.get('/api/moldable/today', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  const now = Date.now()
  const [timers, alarms, stopwatch] = await Promise.all([
    readTimers(workspaceId),
    readAlarms(workspaceId),
    readStopwatch(workspaceId),
  ])

  const views = timers.map((t) => viewTimer(t, now))
  const items: unknown[] = []
  let resume: unknown = null

  const finished = views.filter((t) => t.state === 'finished')
  const running = views
    .filter((t) => t.state === 'running')
    .sort((a, b) => a.currentRemainingMs - b.currentRemainingMs)

  if (finished.length > 0) {
    // A finished timer is the one clock event that always earns attention.
    const first = finished[0]!
    const more = finished.length - 1
    const name = first.label || 'Timer'
    items.push({
      id: 'timer:finished',
      kind: 'timely',
      surface: 'nudge',
      title:
        finished.length > 1
          ? `${finished.length} timers finished`
          : `${name} finished`,
      subtitle: more > 0 ? 'Dismiss to clear them' : 'Time is up',
      icon: '⏰',
      priority: 97,
      dismissible: false,
      actions:
        finished.length === 1
          ? [
              {
                type: 'rpc',
                label: 'Dismiss',
                method: 'clock.timers.reset',
                params: { id: first.id },
              },
              { type: 'open-app', label: 'Open' },
            ]
          : [{ type: 'open-app', label: 'Open' }],
    })
  } else if (running.length > 0) {
    // The soonest-ending running timer, shown as a live, non-dismissible card.
    const soonest = running[0]!
    const name = soonest.label || 'Timer'
    items.push({
      id: 'timer:running',
      kind: 'active',
      surface: 'text',
      title: `${name} · ${formatRelative(soonest.currentRemainingMs)} left`,
      subtitle:
        running.length > 1 ? `${running.length} timers running` : undefined,
      icon: '⏳',
      priority: 88,
      dismissible: false,
      actions: [
        {
          type: 'rpc',
          label: 'Pause',
          method: 'clock.timers.pause',
          params: { id: soonest.id },
        },
        { type: 'open-app', label: 'Open' },
      ],
    })
  }

  // An imminent alarm (within 5 minutes) is worth a quiet heads-up.
  if (finished.length === 0) {
    const next = nextAlarm(alarms, new Date(now))
    if (next) {
      const inMs = next.fireAt.getTime() - now
      if (inMs > 0 && inMs <= 5 * 60_000) {
        items.push({
          id: 'alarm:imminent',
          kind: 'timely',
          surface: 'nudge',
          title: `${next.alarm.label || 'Alarm'} in ${formatRelative(inMs)}`,
          subtitle: next.alarm.time,
          icon: '⏰',
          priority: 84,
          actions: [{ type: 'open-app', label: 'Open' }],
        })
      }
    }
  }

  // A running stopwatch is genuine in-progress work to pick back up.
  if (stopwatch.running && stopwatch.startedAt) {
    resume = {
      title: 'Stopwatch running',
      subtitle: `Started ${formatRelative(now - Date.parse(stopwatch.startedAt))} ago`,
      icon: '⏱️',
      lastTouchedAt: stopwatch.startedAt,
    }
  }

  return c.json({ items, resume, generatedAt: new Date(now).toISOString() })
})

// ---------------------------------------------------------------------------
// UI intent routes (drive contract). The client polls the slot and acks.
// ---------------------------------------------------------------------------

app.get('/api/moldable/ui-intent', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    return c.json(intent, 200, { 'Cache-Control': 'no-store' })
  } catch (error) {
    console.error('Failed to read UI intent:', error)
    return c.json({ error: 'Failed to read UI intent.' }, 500)
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id?.trim()) {
      return c.json({ error: 'Missing id query parameter.' }, 400)
    }
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    const cleared = intent?.id === id
    if (cleared) await writeUiIntent(null, workspaceId)
    return c.json({ ok: true, cleared })
  } catch (error) {
    console.error('Failed to ack UI intent:', error)
    return c.json({ error: 'Failed to ack UI intent.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// App-to-app RPC
// ---------------------------------------------------------------------------

type RpcParams = Record<string, unknown>

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function rpcOk(result: unknown) {
  return { ok: true as const, result }
}

function rpcErr(code: string, message: string) {
  return { ok: false as const, error: { code, message } }
}

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  try {
    const body = (await c.req.json()) as { method?: unknown; params?: unknown }
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)
    const now = Date.now()

    if (method === 'clock.cards.present' || method === 'clock.cards.read') {
      const { id } = z
        .object({ id: z.string().min(1).max(256) })
        .strict()
        .parse(params)
      const timer = (await readTimers(workspaceId)).find(
        (timer) => timer.id === id,
      )
      if (!timer)
        return c.json(
          rpcErr('timer_not_found', 'This timer is no longer available.'),
          404,
        )
      if (method === 'clock.cards.read')
        return c.json(rpcOk(viewTimer(timer, now)))
      return c.json(
        rpcOk({
          appCard: {
            version: 1,
            title: (timer.label || 'Timer').slice(0, 240),
            resourcePath: '/index.html?card=timer',
            input: { id },
            readMethod: 'clock.cards.read',
            actions: [],
            height: 360,
          },
        }),
      )
    }

    // -- Timers ------------------------------------------------------------

    if (method === 'clock.timers.list') {
      const stateFilter = stringParam(params, 'state')
      const views = (await readTimers(workspaceId)).map((t) =>
        viewTimer(t, now),
      )
      return c.json(
        rpcOk(
          stateFilter ? views.filter((t) => t.state === stateFilter) : views,
        ),
      )
    }

    if (method === 'clock.timers.create') {
      const durationMs = Number(params.durationMs)
      if (!Number.isFinite(durationMs) || durationMs < 1000) {
        return c.json(
          rpcErr('invalid_params', 'durationMs must be at least 1000.'),
          400,
        )
      }
      const base: Timer = {
        id: crypto.randomUUID(),
        label: stringParam(params, 'label') ?? '',
        durationMs: Math.round(durationMs),
        endsAt: null,
        remainingMs: Math.round(durationMs),
        running: false,
        createdAt: new Date(now).toISOString(),
      }
      const timer = params.start === true ? startTimer(base, now) : base
      const timers = await readTimers(workspaceId)
      await writeTimers([...timers, timer], workspaceId)
      return c.json(rpcOk(viewTimer(timer, now)))
    }

    if (method === 'clock.timers.update') {
      const id = stringParam(params, 'id')
      const label = stringParam(params, 'label')
      if (!id || label === undefined) {
        return c.json(
          rpcErr('invalid_params', 'id and label are required.'),
          400,
        )
      }
      const timer = await mutateTimer(workspaceId, id, (current) => ({
        ...current,
        label: label.trim(),
      }))
      if (!timer) {
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      }
      return c.json(rpcOk(viewTimer(timer, now)))
    }

    if (
      method === 'clock.timers.resume' ||
      method === 'clock.timers.pause' ||
      method === 'clock.timers.reset'
    ) {
      const id = stringParam(params, 'id')
      if (!id) return c.json(rpcErr('invalid_params', 'id is required.'), 400)
      const mutator =
        method === 'clock.timers.resume'
          ? startTimer
          : method === 'clock.timers.pause'
            ? pauseTimer
            : (timer: Timer) => resetTimer(timer)
      const timer = await mutateTimer(workspaceId, id, mutator)
      if (!timer)
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      return c.json(rpcOk(timer))
    }

    if (method === 'clock.timers.delete') {
      const id = stringParam(params, 'id')
      const timers = await readTimers(workspaceId)
      const filtered = timers.filter((t) => t.id !== id)
      if (!id || filtered.length === timers.length) {
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      }
      await writeTimers(filtered, workspaceId)
      return c.json(rpcOk({ deleted: true, id }))
    }

    // -- Alarms ------------------------------------------------------------
    if (method === 'clock.alarms.list') {
      const alarms = await readAlarms(workspaceId)
      const enabledOnly = params.enabledOnly === true
      return c.json(
        rpcOk(enabledOnly ? alarms.filter((a) => a.enabled) : alarms),
      )
    }

    if (method === 'clock.alarms.next') {
      const alarms = await readAlarms(workspaceId)
      const next = nextAlarm(alarms, new Date(now))
      if (!next) return c.json(rpcOk(null))
      return c.json(
        rpcOk({
          alarm: next.alarm,
          fireAt: next.fireAt.toISOString(),
          inMs: next.fireAt.getTime() - now,
        }),
      )
    }

    if (method === 'clock.alarms.create') {
      const time = normalizeTime(params.time)
      if (!time)
        return c.json(
          rpcErr('invalid_params', 'A valid HH:mm time is required.'),
          400,
        )
      const alarm: Alarm = {
        id: crypto.randomUUID(),
        label: stringParam(params, 'label') ?? '',
        time,
        enabled: params.enabled !== false,
        repeat: normalizeRepeat(params.repeat),
        createdAt: new Date(now).toISOString(),
      }
      const alarms = await readAlarms(workspaceId)
      await writeAlarms([...alarms, alarm], workspaceId)
      return c.json(rpcOk(alarm))
    }

    if (method === 'clock.alarms.update') {
      const id = stringParam(params, 'id')
      const alarms = await readAlarms(workspaceId)
      const index = alarms.findIndex((a) => a.id === id)
      if (index === -1)
        return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
      const current = alarms[index]!
      const time =
        params.time === undefined ? current.time : normalizeTime(params.time)
      if (!time)
        return c.json(
          rpcErr('invalid_params', 'A valid HH:mm time is required.'),
          400,
        )
      alarms[index] = {
        ...current,
        time,
        label: stringParam(params, 'label') ?? current.label,
        enabled:
          typeof params.enabled === 'boolean'
            ? params.enabled
            : current.enabled,
        repeat:
          params.repeat === undefined
            ? current.repeat
            : normalizeRepeat(params.repeat),
      }
      await writeAlarms(alarms, workspaceId)
      return c.json(rpcOk(alarms[index]))
    }

    if (method === 'clock.alarms.delete') {
      const id = stringParam(params, 'id')
      const alarms = await readAlarms(workspaceId)
      const filtered = alarms.filter((a) => a.id !== id)
      if (!id || filtered.length === alarms.length) {
        return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
      }
      await writeAlarms(filtered, workspaceId)
      return c.json(rpcOk({ deleted: true, id }))
    }

    // -- World clocks ------------------------------------------------------
    if (method === 'clock.worldclocks.list') {
      const clocks = await readWorldClocks(workspaceId)
      const at = new Date(now)
      return c.json(
        rpcOk(
          clocks.map((clock) => ({
            id: clock.id,
            label: clock.label,
            timeZone: clock.timeZone,
            localTime: at.toLocaleString('en-US', {
              timeZone: clock.timeZone,
              hour: 'numeric',
              minute: '2-digit',
              weekday: 'short',
            }),
            offset: zoneOffsetLabel(clock.timeZone, at),
            delta: zoneDeltaLabel(clock.timeZone, at),
          })),
        ),
      )
    }

    if (method === 'clock.worldclocks.search') {
      const query = (stringParam(params, 'query') ?? '').trim().toLowerCase()
      const requestedLimit = Number(params.limit)
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(60, Math.max(1, Math.floor(requestedLimit)))
        : 30
      const existing = new Set(
        (await readWorldClocks(workspaceId)).map((clock) => clock.timeZone),
      )
      const candidates = query
        ? allZones()
            .filter((timeZone) =>
              `${zoneToLabel(timeZone)} ${timeZone.replaceAll('_', ' ')}`
                .toLowerCase()
                .includes(query),
            )
            .map((timeZone) => ({ label: zoneToLabel(timeZone), timeZone }))
        : COMMON_ZONES
      const zones = candidates
        .filter((zone) => !existing.has(zone.timeZone))
        .slice(0, limit)
        .map((zone) => ({
          ...zone,
          offset: zoneOffsetLabel(zone.timeZone, new Date(now)),
        }))
      return c.json(
        rpcOk({
          zones,
          queryLabel: query ? `Results for “${query}”` : 'Suggested cities',
          emptyStates:
            zones.length === 0
              ? [
                  {
                    title: query
                      ? 'No matching cities'
                      : 'All suggestions added',
                    description: query
                      ? 'Try a city name or IANA time zone.'
                      : 'Search for another city or time zone.',
                  },
                ]
              : [],
        }),
      )
    }

    if (method === 'clock.worldclocks.create') {
      const timeZone = stringParam(params, 'timeZone') ?? ''
      try {
        new Intl.DateTimeFormat('en-US', { timeZone })
      } catch {
        return c.json(rpcErr('invalid_time_zone', 'Unknown time zone.'), 400)
      }
      const clocks = await readWorldClocks(workspaceId)
      const existing = clocks.find((clock) => clock.timeZone === timeZone)
      if (existing) return c.json(rpcOk(existing))
      const clock: WorldClock = {
        id: crypto.randomUUID(),
        label: stringParam(params, 'label')?.trim() || zoneToLabel(timeZone),
        timeZone,
        createdAt: new Date(now).toISOString(),
      }
      await writeWorldClocks([...clocks, clock], workspaceId)
      return c.json(rpcOk(clock))
    }

    if (method === 'clock.worldclocks.delete') {
      const id = stringParam(params, 'id')
      const clocks = await readWorldClocks(workspaceId)
      const filtered = clocks.filter((clock) => clock.id !== id)
      if (!id || filtered.length === clocks.length) {
        return c.json(
          rpcErr('world_clock_not_found', 'World clock was not found.'),
          404,
        )
      }
      await writeWorldClocks(filtered, workspaceId)
      return c.json(rpcOk({ deleted: true, id }))
    }

    if (
      method === 'clock.stopwatch.start' ||
      method === 'clock.stopwatch.stop' ||
      method === 'clock.stopwatch.lap' ||
      method === 'clock.stopwatch.reset'
    ) {
      const state = await readStopwatch(workspaceId)
      let next = state
      if (method === 'clock.stopwatch.start') {
        next = state.running
          ? state
          : { ...state, running: true, startedAt: new Date(now).toISOString() }
      } else if (method === 'clock.stopwatch.stop') {
        next = state.running
          ? {
              ...state,
              running: false,
              startedAt: null,
              accumulatedMs: elapsedStopwatch(state, now),
            }
          : state
      } else if (method === 'clock.stopwatch.lap') {
        next = state.running
          ? { ...state, laps: [...state.laps, elapsedStopwatch(state, now)] }
          : state
      } else {
        next = { ...DEFAULT_STOPWATCH }
      }
      await writeStopwatch(next, workspaceId)
      return c.json(rpcOk(next))
    }

    // -- Drive contract: signature timer actions ---------------------------
    if (method === 'clock.timers.start') {
      const input = timersStartParamsSchema.parse(params)
      const durationMs = Math.round(input.minutes * 60_000)
      const timer = startTimer(
        {
          id: crypto.randomUUID(),
          label: input.label ?? '',
          durationMs,
          endsAt: null,
          remainingMs: durationMs,
          running: false,
          createdAt: new Date(now).toISOString(),
        },
        now,
      )
      const timers = await readTimers(workspaceId)
      await writeTimers([...timers, timer], workspaceId)
      return c.json(rpcOk(viewTimer(timer, now)))
    }

    if (method === 'clock.timers.cancel') {
      const input = timersCancelParamsSchema.parse(params)
      const timers = await readTimers(workspaceId)
      const filtered = timers.filter((t) => t.id !== input.timerId)
      if (filtered.length === timers.length) {
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      }
      await writeTimers(filtered, workspaceId)
      return c.json(rpcOk({ cancelled: true, id: input.timerId }))
    }

    // -- Drive contract: describe / navigate / read ------------------------
    if (method === 'clock.ui.describe') {
      uiDescribeParamsSchema.parse(params)
      return c.json(rpcOk({ views: UI_VIEWS }))
    }

    if (method === 'clock.ui.navigate') {
      const input = uiNavigateParamsSchema.parse(params)
      if (input.entityId && input.view === 'timers') {
        const timers = await readTimers(workspaceId)
        if (!timers.some((t) => t.id === input.entityId)) {
          return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
        }
      }
      if (input.entityId && input.view === 'alarms') {
        const alarms = await readAlarms(workspaceId)
        if (!alarms.some((a) => a.id === input.entityId)) {
          return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
        }
      }
      const intent = await setUiIntent(input, workspaceId)
      return c.json(rpcOk({ ok: true, intentId: intent.id }))
    }

    if (method === 'clock.ui.read') {
      const input = uiReadParamsSchema.parse(params) ?? {}
      const at = new Date(now)
      const serverNow = at.toISOString()

      const timersSnapshot = async () => {
        const views = (await readTimers(workspaceId)).map((timer) => {
          const view = viewTimer(timer, now)
          const displayLabel = view.label.trim() || 'Timer'
          return {
            ...view,
            displayLabel,
            timerName: `${displayLabel} (${formatDuration(view.durationMs)})`,
            durationLabel: formatDuration(view.durationMs),
            currentRemainingLabel: formatDuration(view.currentRemainingMs),
            countdownAnchor:
              view.state === 'running' && view.endsAt
                ? view.endsAt
                : new Date(now + view.currentRemainingMs).toISOString(),
            stateLabel:
              view.state.charAt(0).toUpperCase() + view.state.slice(1),
            canPause: view.state === 'running',
            canResume: view.state === 'paused' || view.state === 'idle',
            pauseActions:
              view.state === 'running'
                ? [{ id: view.id, label: 'Pause timer' }]
                : [],
            resumeActions:
              view.state === 'paused' || view.state === 'idle'
                ? [{ id: view.id, label: 'Resume timer' }]
                : [],
            resetActions: [{ id: view.id, label: 'Reset timer' }],
          }
        })
        if (!input.entityId) return views
        return views.filter((t) => t.id === input.entityId)
      }
      const alarmsSnapshot = async () => {
        const alarms = (await readAlarms(workspaceId)).map((alarm) => {
          const displayLabel = alarm.label.trim() || 'Alarm'
          const nextFireAt = alarm.enabled ? nextAlarmFire(alarm, at) : null
          return {
            ...alarm,
            displayLabel,
            alarmName: `${displayLabel} at ${alarm.time}`,
            repeatLabel: repeatLabel(alarm.repeat),
            enabledLabel: alarm.enabled ? 'On' : 'Off',
            canEnable: !alarm.enabled,
            canDisable: alarm.enabled,
            nextFireAt: nextFireAt?.toISOString() ?? null,
            nextAlarmCountdowns: nextFireAt
              ? [
                  {
                    anchor: nextFireAt.toISOString(),
                    label: 'Next alarm',
                    detail: displayLabel,
                  },
                ]
              : [],
            draft: {
              id: alarm.id,
              time: alarm.time,
              label: alarm.label,
              repeatLabel: repeatLabel(alarm.repeat),
            },
            createdLabel: new Date(alarm.createdAt).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              },
            ),
            enableActions: alarm.enabled
              ? []
              : [{ id: alarm.id, label: 'Turn on' }],
            disableActions: alarm.enabled
              ? [{ id: alarm.id, label: 'Turn off' }]
              : [],
          }
        })
        if (!input.entityId) return alarms
        return alarms.filter((a) => a.id === input.entityId)
      }
      const worldClocksSnapshot = async () =>
        (await readWorldClocks(workspaceId)).map((clock) => ({
          id: clock.id,
          label: clock.label,
          worldClockName: `${clock.label} (${clock.timeZone})`,
          timeZone: clock.timeZone,
          localTime: at.toLocaleString('en-US', {
            timeZone: clock.timeZone,
            hour: 'numeric',
            minute: '2-digit',
            weekday: 'short',
          }),
          offset: zoneOffsetLabel(clock.timeZone, at),
          delta: zoneDeltaLabel(clock.timeZone, at),
        }))
      const stopwatchSnapshot = async () => {
        const state = await readStopwatch(workspaceId)
        const elapsedMs = elapsedStopwatch(state, now)
        const hasActivity = elapsedMs > 0 || state.laps.length > 0
        const splits = state.laps.map(
          (mark, index) => mark - (state.laps[index - 1] ?? 0),
        )
        const fastest = splits.length > 1 ? Math.min(...splits) : -1
        const slowest = splits.length > 1 ? Math.max(...splits) : -1
        const lapRows = state.laps
          .map((mark, index) => {
            const split = splits[index]!
            const semanticState =
              split === fastest
                ? 'Fastest'
                : split === slowest
                  ? 'Slowest'
                  : 'Lap split'
            return {
              title: `Lap ${index + 1}`,
              subtitle: `${semanticState} · Total ${formatStopwatch(mark)}`,
              timestamp: formatStopwatch(split),
              tone:
                split === fastest
                  ? 'success'
                  : split === slowest
                    ? 'warning'
                    : 'neutral',
            }
          })
          .reverse()
          .map((lap, index, rows) => ({
            ...lap,
            isLast: index === rows.length - 1,
          }))
        return {
          ...state,
          elapsedMs,
          elapsedLabel: formatStopwatch(elapsedMs),
          anchor: state.startedAt ?? serverNow,
          accumulatedSeconds: state.accumulatedMs / 1000,
          runningLabel: state.running ? 'Running' : 'Stopped',
          canStart: !state.running,
          canStop: state.running,
          canLap: state.running,
          canReset: hasActivity,
          lapRows,
          lapHeaders:
            state.laps.length > 0
              ? [{ title: 'Laps', count: state.laps.length }]
              : [],
          startActions: state.running ? [] : [{ label: 'Start' }],
          stopActions: state.running ? [{ label: 'Stop' }] : [],
          lapActions: state.running ? [{ label: 'Lap' }] : [],
          resetActions: hasActivity ? [{ label: 'Reset' }] : [],
        }
      }

      if (input.view === 'timers') {
        const timers = await timersSnapshot()
        if (input.entityId && timers.length === 0) {
          return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
        }
        return c.json(
          rpcOk({
            view: 'timers',
            serverNow,
            timers,
            timerCount: timers.length,
            draft:
              input.entityId && timers[0]
                ? {
                    id: timers[0].id,
                    label: timers[0].label,
                    durationLabel: timers[0].durationLabel,
                  }
                : null,
            emptyStates:
              timers.length === 0
                ? [
                    {
                      title: 'No timers yet',
                      description:
                        'Start a timer for cooking, focus, exercise, or anything else.',
                    },
                  ]
                : [],
          }),
        )
      }
      if (input.view === 'alarms') {
        const alarms = await alarmsSnapshot()
        if (input.entityId && alarms.length === 0) {
          return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
        }
        const next = nextAlarm(alarms, at)
        return c.json(
          rpcOk({
            view: 'alarms',
            serverNow,
            alarms,
            nextAlarm: next
              ? {
                  alarm: next.alarm,
                  fireAt: next.fireAt.toISOString(),
                  inMs: next.fireAt.getTime() - now,
                }
              : null,
            nextAlarmMetrics: next
              ? [
                  {
                    label: next.alarm.label.trim() || 'Alarm',
                    value: next.alarm.time,
                    detail: next.fireAt.toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
                  },
                ]
              : [],
            nextAlarmCountdowns: next
              ? [
                  {
                    anchor: next.fireAt.toISOString(),
                    label: 'Next alarm',
                    detail: next.alarm.label.trim() || 'Alarm',
                  },
                ]
              : [],
            draft: input.entityId && alarms[0] ? alarms[0].draft : null,
            alarmCount: alarms.length,
            emptyStates:
              alarms.length === 0
                ? [
                    {
                      title: 'No alarms yet',
                      description:
                        'Create an alarm with a time and optional label.',
                    },
                  ]
                : [],
          }),
        )
      }
      if (input.view === 'worldclock') {
        const worldClocks = await worldClocksSnapshot()
        return c.json(
          rpcOk({
            view: 'worldclock',
            serverNow,
            updatedLabel: `Updated ${at.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}`,
            worldClocks,
            emptyStates:
              worldClocks.length === 0
                ? [
                    {
                      title: 'No world clocks',
                      description:
                        'Add a city or time zone to compare its local time.',
                    },
                  ]
                : [],
          }),
        )
      }
      if (input.view === 'stopwatch') {
        return c.json(
          rpcOk({
            view: 'stopwatch',
            serverNow,
            stopwatch: await stopwatchSnapshot(),
            notices: [],
          }),
        )
      }

      // No view: the whole app, running timers and world clocks first.
      const [timers, worldClocks, alarms, stopwatch] = await Promise.all([
        timersSnapshot(),
        worldClocksSnapshot(),
        alarmsSnapshot(),
        stopwatchSnapshot(),
      ])
      const next = nextAlarm(alarms, at)
      return c.json(
        rpcOk({
          view: null,
          serverNow,
          timers,
          worldClocks,
          alarms,
          nextAlarm: next
            ? {
                alarm: next.alarm,
                fireAt: next.fireAt.toISOString(),
                inMs: next.fireAt.getTime() - now,
              }
            : null,
          stopwatch,
          worldClockEmptyStates:
            worldClocks.length === 0
              ? [
                  {
                    title: 'No world clocks',
                    description: 'Add a city to compare its local time.',
                  },
                ]
              : [],
          alarmEmptyStates:
            alarms.length === 0
              ? [
                  {
                    title: 'No alarms',
                    description:
                      'Create an alarm for a time you want to track.',
                  },
                ]
              : [],
          timerEmptyStates:
            timers.length === 0
              ? [
                  {
                    title: 'No timers',
                    description: 'Start a countdown for your next task.',
                  },
                ]
              : [],
        }),
      )
    }

    return c.json(
      rpcErr('method_not_found', `Clock does not expose ${method}.`),
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false as const,
          error: {
            code: 'invalid_params',
            message: 'Clock received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Clock RPC failed:', error)
    return c.json(
      rpcErr(
        'clock_rpc_failed',
        error instanceof Error
          ? error.message
          : 'Clock could not complete the request.',
      ),
      500,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
