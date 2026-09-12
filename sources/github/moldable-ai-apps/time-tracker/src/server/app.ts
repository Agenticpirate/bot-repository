import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  PROJECT_COLORS,
  type Project,
  type TimeEntry,
  type TimerState,
  formatHoursDecimal,
} from '@/lib/types'
import { format } from 'date-fns'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const defaultTimer: TimerState = {
  isRunning: false,
  projectId: null,
  description: '',
  startTime: null,
  lastProjectId: null,
}

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 404 | 500

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

function getProjectsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects.json')
}

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

function getTimerPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'timer.json')
}

async function readTimer(workspaceId?: string) {
  const timer = await readJson<TimerState>(
    getTimerPath(workspaceId),
    defaultTimer,
  )

  return { ...defaultTimer, ...timer }
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

// --- Drive contract: UI views, navigation intents, and speakable reads ---

const UI_VIEW_IDS = ['list', 'calendar', 'projects'] as const

type UiViewId = (typeof UI_VIEW_IDS)[number]

type UiIntent = {
  id: string
  view: UiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

const UI_VIEWS: {
  id: UiViewId
  name: string
  description: string
  params?: Record<string, string>
}[] = [
  {
    id: 'list',
    name: 'Weekly list',
    description:
      'The default view: time entries for one week, listed day by day with project, description, and duration. entityId is not used. Pass params.date (YYYY-MM-DD) to jump to the week containing that date; omit it to stay on the currently shown week.',
    params: {
      date: 'Optional YYYY-MM-DD date. Navigates to the week containing this date.',
    },
  },
  {
    id: 'calendar',
    name: 'Week calendar',
    description:
      'A week calendar grid with one column per day; selecting a day filters the entry list below it to that day. entityId may be a YYYY-MM-DD date to select that day (params.date works the same way and wins if both are given). Omit both to open the calendar on the current selection.',
    params: {
      date: 'Optional YYYY-MM-DD date. Selects this day and navigates to its week.',
    },
  },
  {
    id: 'projects',
    name: 'Manage projects',
    description:
      'A sheet listing every project where projects can be renamed, recolored, archived, or deleted. entityId and params are not used.',
  },
]

const uiNavigateSchema = z.object({
  view: z.enum(UI_VIEW_IDS),
  entityId: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})

const uiReadSchema = z.object({
  view: z.enum(UI_VIEW_IDS).optional(),
  entityId: z.string().optional(),
})

const nativeReadSchema = z
  .object({
    view: z.enum([
      'dashboard',
      'timer',
      'entries',
      'entry',
      'summary',
      'projects',
      'archived-projects',
      'project',
      'project-draft',
    ]),
    entryId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.view === 'entry' && !value.entryId) {
      context.addIssue({
        code: 'custom',
        path: ['entryId'],
        message: 'entryId is required for the entry view.',
      })
    }
    if (value.view === 'project' && !value.projectId) {
      context.addIssue({
        code: 'custom',
        path: ['projectId'],
        message: 'projectId is required for the project view.',
      })
    }
  })

const timerStartSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().optional(),
})

const timerStopSchema = z.object({})

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId?: string): Promise<UiIntent | null> {
  const intent = await readJson<UiIntent | null>(
    getUiIntentPath(workspaceId),
    null,
  )
  if (!intent || typeof intent !== 'object') return null
  if (typeof intent.id !== 'string' || typeof intent.view !== 'string') {
    return null
  }
  return intent
}

function zodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message,
    )
    .join('; ')
}

function pickProjectColor(projects: Project[], color?: string): string {
  if (color) return color
  const usedColors = new Set(projects.map((project) => project.color))
  return (
    PROJECT_COLORS.find((projectColor) => !usedColors.has(projectColor)) ??
    PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!
  )
}

function speakableDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 1) return 'less than a minute'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (hours > 0) parts.push(hours === 1 ? '1 hour' : `${hours} hours`)
  if (minutes > 0) {
    parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`)
  }
  return parts.join(' and ')
}

function stopRunningTimer(
  timer: TimerState,
  entries: TimeEntry[],
): TimeEntry | null {
  if (!timer.isRunning || !timer.startTime || !timer.projectId) return null

  const endTime = new Date().toISOString()
  const duration = Math.floor(
    (new Date(endTime).getTime() - new Date(timer.startTime).getTime()) / 1000,
  )
  const entry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId: timer.projectId,
    description: timer.description,
    startTime: timer.startTime,
    endTime,
    duration,
  }
  entries.push(entry)
  return entry
}

function buildSpeakableText(
  timer: TimerState,
  projects: Project[],
  entries: TimeEntry[],
  view?: UiViewId,
  entityId?: string,
): string {
  const projectName = (id: string | null | undefined) =>
    projects.find((project) => project.id === id)?.name ?? 'an unknown project'
  const sentences: string[] = []

  if (timer.isRunning && timer.startTime) {
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000),
    )
    let sentence = `The timer is running on ${projectName(timer.projectId)} with ${speakableDuration(elapsed)} on the clock`
    if (timer.description) {
      sentence += `, working on ${timer.description}`
    }
    sentences.push(`${sentence}.`)
  } else {
    sentences.push('No timer is running.')
  }

  const isDate = entityId && /^\d{4}-\d{2}-\d{2}$/.test(entityId)
  const targetDate = isDate ? entityId : format(new Date(), 'yyyy-MM-dd')
  const dayLabel = isDate
    ? `On ${format(new Date(`${targetDate}T00:00:00`), 'EEEE MMMM d')}`
    : 'Today'
  const dayEntries = entries.filter(
    (entry) =>
      entry.endTime &&
      format(new Date(entry.startTime), 'yyyy-MM-dd') === targetDate,
  )
  const daySeconds = dayEntries.reduce(
    (sum, entry) => sum + (entry.duration ?? 0),
    0,
  )

  if (dayEntries.length === 0) {
    sentences.push(`${dayLabel} has no completed time entries yet.`)
  } else {
    const entryCount =
      dayEntries.length === 1 ? '1 entry' : `${dayEntries.length} entries`
    sentences.push(
      `${dayLabel} you have logged ${speakableDuration(daySeconds)} across ${entryCount}.`,
    )
  }

  if (view === 'projects') {
    const active = projects.filter((project) => !project.archived)
    if (active.length === 0) {
      sentences.push('There are no active projects yet.')
    } else {
      sentences.push(
        `Active projects: ${active.map((project) => project.name).join(', ')}.`,
      )
    }
  }

  return sentences.join(' ')
}

app.get('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)
  return c.json(await readUiIntent(workspaceId))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)
  const id = c.req.query('id')
  const intent = await readUiIntent(workspaceId)

  if (!id || !intent || intent.id !== id) {
    return c.json({ ok: true, cleared: false })
  }

  await writeJson(getUiIntentPath(workspaceId), null)
  return c.json({ ok: true, cleared: true })
})

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function booleanParam(params: RpcParams, key: string): boolean | undefined {
  const value = params[key]
  return typeof value === 'boolean' ? value : undefined
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function limited<T>(items: T[], params: RpcParams, fallback = 100): T[] {
  const limit = Math.max(
    1,
    Math.min(numberParam(params, 'limit') ?? fallback, 500),
  )
  return items.slice(0, limit)
}

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    body: {
      ok: false,
      error: { code, message },
    },
    status,
  }
}

async function readProjects(workspaceId?: string): Promise<Project[]> {
  return readJson<Project[]>(getProjectsPath(workspaceId), [])
}

async function writeProjects(
  projects: Project[],
  workspaceId?: string,
): Promise<void> {
  await writeJson(getProjectsPath(workspaceId), projects)
}

async function readEntries(workspaceId?: string): Promise<TimeEntry[]> {
  return readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
}

async function writeEntries(
  entries: TimeEntry[],
  workspaceId?: string,
): Promise<void> {
  await writeJson(getEntriesPath(workspaceId), entries)
}

function filterEntries(entries: TimeEntry[], params: RpcParams): TimeEntry[] {
  const startDate = stringParam(params, 'startDate')
  const endDate = stringParam(params, 'endDate')
  const projectId = stringParam(params, 'projectId')
  const query = stringParam(params, 'query')?.toLowerCase()
  let result = [...entries]

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    result = result.filter((entry) => new Date(entry.startTime) >= start)
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    result = result.filter((entry) => new Date(entry.startTime) <= end)
  }
  if (projectId) {
    result = result.filter((entry) => entry.projectId === projectId)
  }
  if (query) {
    result = result.filter((entry) =>
      entry.description.toLowerCase().includes(query),
    )
  }

  result.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )
  return limited(result, params)
}

function summarizeTime(
  entries: TimeEntry[],
  projects: Project[],
  params: RpcParams,
) {
  const filteredEntries = filterEntries(entries, {
    ...params,
    limit: 500,
  })
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const byProject = new Map<
    string,
    { project: Project | null; seconds: number }
  >()
  let totalSeconds = 0

  for (const entry of filteredEntries) {
    const seconds = entry.duration ?? 0
    totalSeconds += seconds
    const existing = byProject.get(entry.projectId) ?? {
      project: projectMap.get(entry.projectId) ?? null,
      seconds: 0,
    }
    existing.seconds += seconds
    byProject.set(entry.projectId, existing)
  }

  return {
    totalSeconds,
    totalHours: Number(formatHoursDecimal(totalSeconds)),
    entries: filteredEntries.length,
    byProject: Array.from(byProject.entries()).map(([projectId, value]) => ({
      projectId,
      projectName: value.project?.name ?? 'Unknown',
      seconds: value.seconds,
      hours: Number(formatHoursDecimal(value.seconds)),
    })),
  }
}

function formatTrackedDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
}

function formatTrackedDate(value: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function localDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

function currentWeekRange(now: Date) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    startDate: localDateKey(start),
    endDate: localDateKey(end),
    label: `${new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(start)} – ${new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(end)}`,
  }
}

const NATIVE_PROJECT_PALETTE = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
] as const

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'time-tracker',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      ...corsHeaders,
      'Cache-Control': 'no-store',
    },
  )
})

app.options('/api/moldable/health', (c) =>
  c.body(null, 204, {
    ...corsHeaders,
    'Cache-Control': 'no-store',
  }),
)

// Today contribution: surface a running timer (so it's never forgotten) or a
// one-tap resume of the last project. Silent when nothing is tracking.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const [timer, projects, entries] = await Promise.all([
    readTimer(workspaceId),
    readJson<Project[]>(getProjectsPath(workspaceId), []),
    readJson<TimeEntry[]>(getEntriesPath(workspaceId), []),
  ])
  const projectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.name ?? 'Untracked'

  const items: unknown[] = []
  let resume: unknown = null

  if (timer.isRunning && timer.projectId && timer.startTime) {
    const mins = Math.max(
      0,
      Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 60000),
    )
    const elapsed =
      mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
    // A timer running 8h+ is almost always a forget-to-stop, not real work.
    // Flag it as a blocked-style nudge so it stands out and gets stopped.
    const forgotten = mins >= 8 * 60

    items.push({
      id: 'timer:active',
      kind: forgotten ? 'blocked' : 'active',
      surface: 'text',
      title: forgotten
        ? `Timer running ${elapsed} on ${projectName(timer.projectId)}`
        : `Tracking ${projectName(timer.projectId)}`,
      subtitle: forgotten
        ? 'Still running — stop it if you forgot'
        : timer.description
          ? `${elapsed} · ${timer.description}`
          : `${elapsed} elapsed`,
      icon: forgotten ? '⚠️' : '⏱️',
      priority: forgotten ? 92 : 95,
      dismissible: false,
      actions: [
        {
          type: 'rpc',
          label: 'Stop',
          method: 'time-tracker.timer.stopAndSave',
        },
        { type: 'open-app', label: 'Open' },
      ],
    })
  } else if (timer.lastProjectId) {
    // Only resume if there's a real prior session to pick back up — not a
    // bare project that was never tracked.
    const lastEntry = entries
      .filter((e) => e.projectId === timer.lastProjectId && e.endTime)
      .sort(
        (a, b) => Date.parse(b.endTime ?? '') - Date.parse(a.endTime ?? ''),
      )[0]

    if (lastEntry) {
      const lastSeconds = lastEntry.duration ?? 0
      const lastSpan =
        lastSeconds >= 3600
          ? `${Math.floor(lastSeconds / 3600)}h ${Math.floor((lastSeconds % 3600) / 60)}m`
          : `${Math.floor(lastSeconds / 60)}m`
      resume = {
        title: projectName(timer.lastProjectId),
        subtitle: lastEntry.description
          ? `Last: ${lastSpan} · ${lastEntry.description}`
          : `Last session ${lastSpan}`,
        icon: '⏱️',
        lastTouchedAt: lastEntry.endTime,
      }
    }
  }

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/projects', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  return c.json(projects)
})

app.post('/api/projects', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<{ name?: unknown; color?: unknown }>()
  const name = typeof body.name === 'string' ? body.name : ''
  const color = typeof body.color === 'string' ? body.color : undefined

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const usedColors = new Set(projects.map((project) => project.color))
  const availableColor =
    color ??
    PROJECT_COLORS.find((projectColor) => !usedColors.has(projectColor)) ??
    PROJECT_COLORS[projects.length % PROJECT_COLORS.length]

  const newProject: Project = {
    id: crypto.randomUUID(),
    name,
    color: availableColor,
    createdAt: new Date().toISOString(),
  }

  projects.push(newProject)
  await writeJson(getProjectsPath(workspaceId), projects)

  return c.json(newProject)
})

app.patch('/api/projects/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json<Partial<Project>>()

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const index = projects.findIndex((project) => project.id === id)

  if (index === -1) {
    return c.json({ error: 'Project not found' }, 404)
  }

  projects[index] = { ...projects[index], ...body }
  await writeJson(getProjectsPath(workspaceId), projects)

  return c.json(projects[index])
})

app.delete('/api/projects/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const filtered = projects.filter((project) => project.id !== id)

  if (filtered.length === projects.length) {
    return c.json({ error: 'Project not found' }, 404)
  }

  await writeJson(getProjectsPath(workspaceId), filtered)

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filteredEntries = entries.filter((entry) => entry.projectId !== id)
  await writeJson(getEntriesPath(workspaceId), filteredEntries)

  return c.json({ success: true })
})

app.get('/api/entries', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const projectId = c.req.query('projectId')

  let entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    entries = entries.filter((entry) => new Date(entry.startTime) >= start)
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    entries = entries.filter((entry) => new Date(entry.startTime) <= end)
  }

  if (projectId) {
    entries = entries.filter((entry) => entry.projectId === projectId)
  }

  entries.sort(
    (entryA, entryB) =>
      new Date(entryB.startTime).getTime() -
      new Date(entryA.startTime).getTime(),
  )

  return c.json(entries)
})

app.post('/api/entries', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<Partial<TimeEntry>>()
  const { projectId, description, startTime, endTime, duration } = body

  if (!projectId || !startTime) {
    return c.json({ error: 'Project and start time are required' }, 400)
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const newEntry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId,
    description: description ?? '',
    startTime,
    endTime,
    duration,
  }

  entries.push(newEntry)
  await writeJson(getEntriesPath(workspaceId), entries)

  return c.json(newEntry)
})

app.patch('/api/entries/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json<Partial<TimeEntry>>()

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const index = entries.findIndex((entry) => entry.id === id)

  if (index === -1) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  entries[index] = { ...entries[index], ...body }

  if (entries[index].endTime) {
    const start = new Date(entries[index].startTime).getTime()
    const end = new Date(entries[index].endTime).getTime()
    entries[index].duration = Math.floor((end - start) / 1000)
  }

  await writeJson(getEntriesPath(workspaceId), entries)

  return c.json(entries[index])
})

app.delete('/api/entries/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filtered = entries.filter((entry) => entry.id !== id)

  if (filtered.length === entries.length) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  await writeJson(getEntriesPath(workspaceId), filtered)

  return c.json({ success: true })
})

app.get('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const timer = await readTimer(workspaceId)
  return c.json(timer)
})

app.post('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<{
    projectId?: unknown
    description?: unknown
  }>()
  const projectId = typeof body.projectId === 'string' ? body.projectId : ''
  const description =
    typeof body.description === 'string' ? body.description : ''

  if (!projectId) {
    return c.json({ error: 'Project ID is required' }, 400)
  }

  const timer: TimerState = {
    isRunning: true,
    projectId,
    description,
    startTime: new Date().toISOString(),
    lastProjectId: projectId,
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return c.json(timer)
})

app.delete('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const timer = await readTimer(workspaceId)

  if (!timer.isRunning || !timer.startTime || !timer.projectId) {
    return c.json({ error: 'No timer running' }, 400)
  }

  const endTime = new Date().toISOString()
  const startMs = new Date(timer.startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const duration = Math.floor((endMs - startMs) / 1000)
  const entry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId: timer.projectId,
    description: timer.description,
    startTime: timer.startTime,
    endTime,
    duration,
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  entries.push(entry)
  await writeJson(getEntriesPath(workspaceId), entries)

  const resetTimer: TimerState = {
    ...defaultTimer,
    lastProjectId: timer.projectId,
  }
  await writeJson(getTimerPath(workspaceId), resetTimer)

  return c.json({ entry, timer: resetTimer })
})

app.patch('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<Partial<TimerState>>()
  const timer = await readTimer(workspaceId)

  if (body.description !== undefined) {
    timer.description = body.description
  }

  if (body.projectId !== undefined) {
    timer.projectId = body.projectId
  }

  if (body.lastProjectId !== undefined) {
    timer.lastProjectId = body.lastProjectId
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return c.json(timer)
})

app.get('/api/export', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const exportFormat = c.req.query('format') ?? 'csv'
  const projectId = c.req.query('projectId')

  if (!startDate || !endDate) {
    return c.json({ error: 'Start and end date are required' }, 400)
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59.999`)

  let filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.startTime)
    return entryDate >= start && entryDate <= end && entry.endTime
  })

  if (projectId) {
    filteredEntries = filteredEntries.filter(
      (entry) => entry.projectId === projectId,
    )
  }

  filteredEntries.sort(
    (entryA, entryB) =>
      new Date(entryA.startTime).getTime() -
      new Date(entryB.startTime).getTime(),
  )

  if (exportFormat === 'json') {
    const jsonData = filteredEntries.map((entry) => {
      const project = projectMap.get(entry.projectId)
      return {
        date: format(new Date(entry.startTime), 'yyyy-MM-dd'),
        project: project?.name || 'Unknown',
        description: entry.description,
        startTime: format(new Date(entry.startTime), 'HH:mm'),
        endTime: entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
        hours: formatHoursDecimal(entry.duration || 0),
        durationSeconds: entry.duration || 0,
      }
    })

    return c.json(jsonData, 200, {
      'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.json"`,
    })
  }

  const csvHeaders = [
    'Date',
    'Project',
    'Description',
    'Start Time',
    'End Time',
    'Hours',
  ]
  const csvRows = filteredEntries.map((entry) => {
    const project = projectMap.get(entry.projectId)
    return [
      format(new Date(entry.startTime), 'yyyy-MM-dd'),
      `"${(project?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${entry.description.replace(/"/g, '""')}"`,
      format(new Date(entry.startTime), 'HH:mm'),
      entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
      formatHoursDecimal(entry.duration || 0),
    ].join(',')
  })

  const totalSeconds = filteredEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0,
  )
  csvRows.push('')
  csvRows.push(`Total,,,,,"${formatHoursDecimal(totalSeconds)}"`)

  const csv = [csvHeaders.join(','), ...csvRows].join('\n')

  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.csv"`,
  })
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (
      method === 'time-tracker.cards.present' ||
      method === 'time-tracker.cards.read'
    ) {
      const input = z
        .object({
          view: z.enum(['timer', 'summary']),
          startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          projectId: z.string().min(1).max(256).optional(),
        })
        .strict()
        .parse(params)
      if (method === 'time-tracker.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: input.view === 'timer' ? 'Current timer' : 'Time tracked',
              resourcePath: '/index.html?card=time',
              input,
              readMethod: 'time-tracker.cards.read',
              actions: [],
              height: 360,
            },
          },
        })
      const projects = await readProjects(workspaceId)
      if (input.view === 'timer') {
        const timer = await readTimer(workspaceId)
        return c.json({
          ok: true,
          result: {
            view: 'timer' as const,
            timer,
            projectName:
              projects.find((project) => project.id === timer.projectId)
                ?.name ?? 'No project',
            elapsedSeconds:
              timer.isRunning && timer.startTime
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - Date.parse(timer.startTime)) / 1000,
                    ),
                  )
                : 0,
          },
        })
      }
      const summary = summarizeTime(
        await readEntries(workspaceId),
        projects,
        input,
      )
      return c.json({
        ok: true,
        result: {
          view: 'summary' as const,
          ...summary,
          byProject: summary.byProject.slice(0, 40),
          startDate: input.startDate,
          endDate: input.endDate,
          truncated: summary.entries >= 500 || summary.byProject.length > 40,
        },
      })
    }

    if (method === 'time-tracker.projects.list') {
      const projects = await readProjects(workspaceId)
      const includeArchived = booleanParam(params, 'includeArchived') ?? false
      const query = stringParam(params, 'query')?.toLowerCase()
      const filtered = projects.filter((project) => {
        if (!includeArchived && project.archived) return false
        return query ? project.name.toLowerCase().includes(query) : true
      })
      return c.json({ ok: true, result: limited(filtered, params) })
    }

    if (method === 'time-tracker.projects.create') {
      const name = stringParam(params, 'name')?.trim()
      if (!name) {
        const error = rpcError('invalid_params', 'name is required')
        return c.json(error.body, error.status)
      }

      const projects = await readProjects(workspaceId)
      const color = stringParam(params, 'color')
      const usedColors = new Set(projects.map((project) => project.color))
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        color:
          color ??
          PROJECT_COLORS.find(
            (projectColor) => !usedColors.has(projectColor),
          ) ??
          PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!,
        createdAt: new Date().toISOString(),
      }
      await writeProjects([...projects, project], workspaceId)
      return c.json({ ok: true, result: project })
    }

    if (method === 'time-tracker.projects.update') {
      const id = stringParam(params, 'id')
      const projects = await readProjects(workspaceId)
      const index = projects.findIndex((project) => project.id === id)
      if (!id || index === -1) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }

      projects[index] = {
        ...projects[index]!,
        ...(stringParam(params, 'name') !== undefined
          ? { name: stringParam(params, 'name')! }
          : {}),
        ...(stringParam(params, 'color') !== undefined
          ? { color: stringParam(params, 'color')! }
          : {}),
        ...(booleanParam(params, 'archived') !== undefined
          ? { archived: booleanParam(params, 'archived') }
          : {}),
      }
      await writeProjects(projects, workspaceId)
      return c.json({ ok: true, result: projects[index] })
    }

    if (method === 'time-tracker.entries.list') {
      const entries = await readEntries(workspaceId)
      return c.json({ ok: true, result: filterEntries(entries, params) })
    }

    if (method === 'time-tracker.entries.create') {
      const projectId = stringParam(params, 'projectId')
      const startTime = stringParam(params, 'startTime')
      if (!projectId || !startTime) {
        const error = rpcError(
          'invalid_params',
          'projectId and startTime are required',
        )
        return c.json(error.body, error.status)
      }

      const endTime = stringParam(params, 'endTime')
      const projects = await readProjects(workspaceId)
      if (
        !projects.some(
          (project) => project.id === projectId && !project.archived,
        )
      ) {
        const error = rpcError(
          'project_not_found',
          'Choose an active project.',
          404,
        )
        return c.json(error.body, error.status)
      }
      const startMillis = new Date(startTime).getTime()
      const endMillis = endTime ? new Date(endTime).getTime() : undefined
      if (
        !Number.isFinite(startMillis) ||
        (endMillis !== undefined &&
          (!Number.isFinite(endMillis) || endMillis < startMillis))
      ) {
        const error = rpcError(
          'invalid_params',
          'Choose valid start and end times; end must not be before start.',
        )
        return c.json(error.body, error.status)
      }
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        projectId,
        description: stringParam(params, 'description') ?? '',
        startTime,
        endTime,
        duration: numberParam(params, 'duration'),
      }

      if (!entry.duration && entry.endTime) {
        entry.duration = Math.floor(
          (new Date(entry.endTime).getTime() -
            new Date(entry.startTime).getTime()) /
            1000,
        )
      }

      const entries = await readEntries(workspaceId)
      await writeEntries([...entries, entry], workspaceId)
      return c.json({ ok: true, result: entry })
    }

    if (method === 'time-tracker.entries.update') {
      const id = stringParam(params, 'id')
      const entries = await readEntries(workspaceId)
      const index = entries.findIndex((entry) => entry.id === id)
      if (!id || index === -1) {
        const error = rpcError('entry_not_found', 'Entry was not found', 404)
        return c.json(error.body, error.status)
      }

      const nextProjectId = stringParam(params, 'projectId')
      if (nextProjectId !== undefined) {
        const projects = await readProjects(workspaceId)
        if (!projects.some((project) => project.id === nextProjectId)) {
          const error = rpcError(
            'project_not_found',
            'Project was not found',
            404,
          )
          return c.json(error.body, error.status)
        }
      }

      entries[index] = {
        ...entries[index]!,
        ...(stringParam(params, 'projectId') !== undefined
          ? { projectId: stringParam(params, 'projectId')! }
          : {}),
        ...(stringParam(params, 'description') !== undefined
          ? { description: stringParam(params, 'description')! }
          : {}),
        ...(stringParam(params, 'startTime') !== undefined
          ? { startTime: stringParam(params, 'startTime')! }
          : {}),
        ...(stringParam(params, 'endTime') !== undefined
          ? { endTime: stringParam(params, 'endTime')! }
          : {}),
        ...(numberParam(params, 'duration') !== undefined
          ? { duration: numberParam(params, 'duration') }
          : {}),
      }

      const startMillis = new Date(entries[index]!.startTime).getTime()
      const endMillis = entries[index]!.endTime
        ? new Date(entries[index]!.endTime!).getTime()
        : undefined
      if (
        !Number.isFinite(startMillis) ||
        (endMillis !== undefined &&
          (!Number.isFinite(endMillis) || endMillis < startMillis))
      ) {
        const error = rpcError(
          'invalid_params',
          'Choose valid start and end times; end must not be before start.',
        )
        return c.json(error.body, error.status)
      }

      if (entries[index]!.endTime) {
        const start = new Date(entries[index]!.startTime).getTime()
        const end = new Date(entries[index]!.endTime!).getTime()
        entries[index]!.duration = Math.floor((end - start) / 1000)
      }

      await writeEntries(entries, workspaceId)
      return c.json({ ok: true, result: entries[index] })
    }

    if (method === 'time-tracker.entries.delete') {
      const id = stringParam(params, 'id')
      const entries = await readEntries(workspaceId)
      const filtered = entries.filter((entry) => entry.id !== id)
      if (!id || filtered.length === entries.length) {
        const error = rpcError('entry_not_found', 'Entry was not found', 404)
        return c.json(error.body, error.status)
      }
      await writeEntries(filtered, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id } })
    }

    if (method === 'time-tracker.timer.get') {
      return c.json({ ok: true, result: await readTimer(workspaceId) })
    }

    if (method === 'time-tracker.timer.startByProjectId') {
      const projectId = stringParam(params, 'projectId')
      if (!projectId) {
        const error = rpcError('invalid_params', 'projectId is required')
        return c.json(error.body, error.status)
      }

      const [currentTimer, projects] = await Promise.all([
        readTimer(workspaceId),
        readProjects(workspaceId),
      ])
      if (currentTimer.isRunning) {
        const error = rpcError(
          'timer_already_running',
          'Stop the current timer before starting another one.',
        )
        return c.json(error.body, 409)
      }
      if (
        !projects.some(
          (project) => project.id === projectId && !project.archived,
        )
      ) {
        const error = rpcError('project_not_found', 'Choose an active project.')
        return c.json(error.body, 404)
      }

      const timer: TimerState = {
        isRunning: true,
        projectId,
        description: stringParam(params, 'description') ?? '',
        startTime: new Date().toISOString(),
        lastProjectId: projectId,
      }
      await writeJson(getTimerPath(workspaceId), timer)
      return c.json({ ok: true, result: timer })
    }

    if (method === 'time-tracker.timer.update') {
      const timer = await readTimer(workspaceId)
      const updated: TimerState = {
        ...timer,
        ...(stringParam(params, 'projectId') !== undefined
          ? { projectId: stringParam(params, 'projectId')! }
          : {}),
        ...(stringParam(params, 'description') !== undefined
          ? { description: stringParam(params, 'description')! }
          : {}),
      }
      await writeJson(getTimerPath(workspaceId), updated)
      return c.json({ ok: true, result: updated })
    }

    if (method === 'time-tracker.timer.stopAndSave') {
      const timer = await readTimer(workspaceId)
      if (!timer.isRunning || !timer.startTime || !timer.projectId) {
        const error = rpcError('timer_not_running', 'No timer is running', 400)
        return c.json(error.body, error.status)
      }

      const endTime = new Date().toISOString()
      const duration = Math.floor(
        (new Date(endTime).getTime() - new Date(timer.startTime).getTime()) /
          1000,
      )
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        projectId: timer.projectId,
        description: timer.description,
        startTime: timer.startTime,
        endTime,
        duration,
      }
      const entries = await readEntries(workspaceId)
      await writeEntries([...entries, entry], workspaceId)
      const resetTimer: TimerState = {
        ...defaultTimer,
        lastProjectId: timer.projectId,
      }
      await writeJson(getTimerPath(workspaceId), resetTimer)
      return c.json({ ok: true, result: { entry, timer: resetTimer } })
    }

    if (method === 'time-tracker.summary') {
      const [entries, projects] = await Promise.all([
        readEntries(workspaceId),
        readProjects(workspaceId),
      ])
      return c.json({
        ok: true,
        result: summarizeTime(entries, projects, params),
      })
    }

    if (method === 'time-tracker.ui.describe') {
      return c.json({ ok: true, result: { views: UI_VIEWS } })
    }

    if (method === 'time-tracker.ui.navigate') {
      const parsed = uiNavigateSchema.safeParse(params)
      if (!parsed.success) {
        const error = rpcError('invalid_params', zodIssues(parsed.error))
        return c.json(error.body, error.status)
      }

      const intent: UiIntent = {
        id: crypto.randomUUID(),
        view: parsed.data.view,
        ...(parsed.data.entityId !== undefined
          ? { entityId: parsed.data.entityId }
          : {}),
        ...(parsed.data.params !== undefined
          ? { params: parsed.data.params }
          : {}),
        createdAt: new Date().toISOString(),
      }
      await writeJson(getUiIntentPath(workspaceId), intent)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (method === 'time-tracker.ui.read') {
      const parsed = uiReadSchema.safeParse(params)
      if (!parsed.success) {
        const error = rpcError('invalid_params', zodIssues(parsed.error))
        return c.json(error.body, error.status)
      }

      const [timer, projects, entries] = await Promise.all([
        readTimer(workspaceId),
        readProjects(workspaceId),
        readEntries(workspaceId),
      ])
      const text = buildSpeakableText(
        timer,
        projects,
        entries,
        parsed.data.view,
        parsed.data.entityId,
      )
      return c.json({ ok: true, result: { text } })
    }

    if (method === 'time-tracker.native.read') {
      const parsed = nativeReadSchema.safeParse(params)
      if (!parsed.success) {
        const error = rpcError('invalid_params', zodIssues(parsed.error))
        return c.json(error.body, error.status)
      }
      const [timer, projects, entries] = await Promise.all([
        readTimer(workspaceId),
        readProjects(workspaceId),
        readEntries(workspaceId),
      ])
      const projectMap = new Map(
        projects.map((project) => [project.id, project]),
      )
      const activeProjects = projects.filter((project) => !project.archived)
      const archivedProjects = projects.filter((project) => project.archived)
      const serverNow = new Date().toISOString()
      const weekRange = currentWeekRange(new Date())
      const todayKey = localDateKey(new Date())
      const timerProjectName = timer.projectId
        ? (projectMap.get(timer.projectId)?.name ?? 'Unknown project')
        : 'No project selected'
      const timerProjection = {
        anchor: timer.startTime ?? serverNow,
        serverNow,
        running: timer.isRunning,
        accumulatedSeconds: 0,
        statusLabel: timer.isRunning ? 'Running' : 'Stopped',
        projectName: timerProjectName,
        descriptionDisplay: timer.isRunning
          ? timer.description.trim() || 'No description'
          : 'Ready to start',
        startLabel: timer.isRunning
          ? formatTrackedDate(timer.startTime)
          : 'Not running',
        canStart: !timer.isRunning,
        canStop: timer.isRunning,
      }
      const projectSummary = (
        summary: ReturnType<typeof summarizeTime>,
        periodLabel: string,
      ) => {
        const byProject = summary.byProject.slice(0, 50)
        return {
          periodLabel,
          totalHoursLabel: formatTrackedDuration(summary.totalSeconds),
          entriesLabel: String(summary.entries),
          byProject: byProject.map((project) => ({
            ...project,
            durationLabel: formatTrackedDuration(project.seconds),
          })),
          emptyStates:
            summary.entries === 0
              ? [
                  {
                    title: 'Nothing to summarize yet',
                    description:
                      'Finish a timer session to build this summary.',
                  },
                ]
              : [],
        }
      }
      const projectedProjects = (items: Project[]) =>
        items.slice(0, parsed.data.limit ?? 100).map((project) => ({
          ...project,
          createdAtLabel: formatTrackedDate(project.createdAt),
          statusLabel: project.archived ? 'Archived' : 'Active',
          archiveName: project.name,
        }))

      if (parsed.data.view === 'dashboard') {
        const today = summarizeTime(entries, projects, {
          startDate: todayKey,
          endDate: todayKey,
        })
        const week = summarizeTime(entries, projects, weekRange)
        return c.json({
          ok: true,
          result: {
            serverNow,
            title: timer.isRunning ? 'Timer running' : 'Ready when you are',
            timer: timerProjection,
            timerStatus: timer.isRunning ? 'Running' : 'Stopped',
            todayDurationLabel: formatTrackedDuration(today.totalSeconds),
            todayEntriesLabel: String(today.entries),
            weekDurationLabel: formatTrackedDuration(week.totalSeconds),
            weekSummaryLabel: `This week ${formatTrackedDuration(week.totalSeconds)}`,
            weekRangeLabel: weekRange.label,
          },
        })
      }

      if (parsed.data.view === 'timer') {
        return c.json({
          ok: true,
          result: {
            serverNow,
            timer: timerProjection,
            timers: timer.isRunning ? [{ ...timer, ...timerProjection }] : [],
            stopActions: timer.isRunning ? [{ label: 'Stop and save' }] : [],
            startRoutes: timer.isRunning ? [] : [{ label: 'Start a timer' }],
            emptyStates: timer.isRunning
              ? []
              : [
                  {
                    title: 'No timer is running',
                    description: 'Choose Start a timer below.',
                  },
                ],
          },
        })
      }

      if (parsed.data.view === 'entries') {
        const recentEntries = filterEntries(entries, {
          limit: parsed.data.limit ?? 50,
        }).map((entry) => {
          const projectName =
            projectMap.get(entry.projectId)?.name ?? 'Unknown project'
          const dateLabel = new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(entry.startTime))
          return {
            ...entry,
            descriptionDisplay: entry.description.trim() || 'Untitled session',
            projectName,
            durationHours: Number(formatHoursDecimal(entry.duration ?? 0)),
            durationLabel: formatTrackedDuration(entry.duration ?? 0),
            startLabel: formatTrackedDate(entry.startTime),
            dateLabel,
            deleteName: `${projectName} on ${dateLabel}`,
          }
        })
        return c.json({
          ok: true,
          result: {
            entries: recentEntries,
            subtitle: `${recentEntries.length} recent ${recentEntries.length === 1 ? 'entry' : 'entries'}`,
            emptyStates:
              recentEntries.length === 0
                ? [
                    {
                      title: 'No tracked time yet',
                      description: 'Completed timer sessions will appear here.',
                    },
                  ]
                : [],
          },
        })
      }

      if (parsed.data.view === 'entry') {
        const entry = entries.find(
          (candidate) => candidate.id === parsed.data.entryId,
        )
        if (!entry) {
          const error = rpcError('entry_not_found', 'Entry was not found', 404)
          return c.json(error.body, error.status)
        }
        return c.json({
          ok: true,
          result: {
            ...entry,
            draft: {
              id: entry.id,
              description: entry.description,
              startTime: entry.startTime,
              endTime: entry.endTime ?? '',
            },
            descriptionDraft: entry.description,
            startTimeDraft: entry.startTime,
            endTimeDraft: entry.endTime ?? '',
            descriptionDisplay: entry.description.trim() || 'Untitled session',
            projectName:
              projectMap.get(entry.projectId)?.name ?? 'Unknown project',
            deleteName: `${projectMap.get(entry.projectId)?.name ?? 'Unknown project'} on ${new Intl.DateTimeFormat(
              undefined,
              { month: 'short', day: 'numeric', year: 'numeric' },
            ).format(new Date(entry.startTime))}`,
            durationLabel: formatTrackedDuration(entry.duration ?? 0),
            startLabel: formatTrackedDate(entry.startTime),
            endLabel: entry.endTime
              ? formatTrackedDate(entry.endTime)
              : 'No end time',
          },
        })
      }

      if (parsed.data.view === 'summary') {
        const today = summarizeTime(entries, projects, {
          startDate: todayKey,
          endDate: todayKey,
        })
        const week = summarizeTime(entries, projects, weekRange)
        const allTime = summarizeTime(entries, projects, {})
        return c.json({
          ok: true,
          result: {
            today: projectSummary(today, 'Today'),
            week: projectSummary(week, weekRange.label),
            allTime: projectSummary(allTime, 'All tracked time'),
          },
        })
      }

      if (parsed.data.view === 'project-draft') {
        return c.json({
          ok: true,
          result: {
            draft: { name: '', color: NATIVE_PROJECT_PALETTE[0].value },
            palette: NATIVE_PROJECT_PALETTE,
          },
        })
      }

      if (parsed.data.view === 'project') {
        const project = projects.find(
          (candidate) => candidate.id === parsed.data.projectId,
        )
        if (!project) {
          const error = rpcError(
            'project_not_found',
            'Project was not found',
            404,
          )
          return c.json(error.body, error.status)
        }
        return c.json({
          ok: true,
          result: {
            ...project,
            draft: {
              id: project.id,
              name: project.name,
              color: project.color,
            },
            palette: NATIVE_PROJECT_PALETTE,
            nameDraft: project.name,
            colorDraft: project.color,
            createdAtLabel: formatTrackedDate(project.createdAt),
            statusLabel: project.archived ? 'Archived' : 'Active',
            canArchive: !project.archived,
            canUnarchive: Boolean(project.archived),
            archiveName: project.name,
            archiveActions: project.archived
              ? []
              : [{ label: 'Archive project' }],
          },
        })
      }

      const showingArchived = parsed.data.view === 'archived-projects'
      const visibleProjects = projectedProjects(
        showingArchived ? archivedProjects : activeProjects,
      )
      return c.json({
        ok: true,
        result: {
          projects: visibleProjects,
          subtitle: showingArchived
            ? `${visibleProjects.length} archived ${visibleProjects.length === 1 ? 'project' : 'projects'}`
            : `${visibleProjects.length} active ${visibleProjects.length === 1 ? 'project' : 'projects'}`,
          emptyStates:
            visibleProjects.length === 0
              ? [
                  {
                    title: showingArchived
                      ? 'No archived projects'
                      : 'No active projects',
                    description: showingArchived
                      ? 'Archived projects will appear here.'
                      : 'Create a project to start tracking time.',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'time-tracker.timer.start') {
      const parsed = timerStartSchema.safeParse(params)
      if (!parsed.success) {
        const error = rpcError('invalid_params', zodIssues(parsed.error))
        return c.json(error.body, error.status)
      }

      const { projectId, projectName, description } = parsed.data
      const projects = await readProjects(workspaceId)
      const timer = await readTimer(workspaceId)
      let project: Project | undefined
      let createdProject = false

      if (projectId) {
        project = projects.find((candidate) => candidate.id === projectId)
        if (!project) {
          const error = rpcError(
            'project_not_found',
            'Project was not found',
            404,
          )
          return c.json(error.body, error.status)
        }
      } else if (projectName?.trim()) {
        const needle = projectName.trim().toLowerCase()
        project =
          projects.find(
            (candidate) =>
              !candidate.archived && candidate.name.toLowerCase() === needle,
          ) ??
          projects.find((candidate) => candidate.name.toLowerCase() === needle)
        if (!project) {
          project = {
            id: crypto.randomUUID(),
            name: projectName.trim(),
            color: pickProjectColor(projects),
            createdAt: new Date().toISOString(),
          }
          await writeProjects([...projects, project], workspaceId)
          createdProject = true
        }
      } else {
        project = projects.find(
          (candidate) => candidate.id === timer.lastProjectId,
        )
        if (!project) {
          const error = rpcError(
            'invalid_params',
            'Provide projectId or projectName; there is no previous project to resume.',
          )
          return c.json(error.body, error.status)
        }
      }

      const entries = await readEntries(workspaceId)
      const stoppedEntry = stopRunningTimer(timer, entries)
      if (stoppedEntry) {
        await writeEntries(entries, workspaceId)
      }

      const nextTimer: TimerState = {
        isRunning: true,
        projectId: project.id,
        description: description ?? '',
        startTime: new Date().toISOString(),
        lastProjectId: project.id,
      }
      await writeJson(getTimerPath(workspaceId), nextTimer)
      return c.json({
        ok: true,
        result: {
          timer: nextTimer,
          project,
          createdProject,
          stoppedEntry,
        },
      })
    }

    if (method === 'time-tracker.timer.stop') {
      const parsed = timerStopSchema.safeParse(params)
      if (!parsed.success) {
        const error = rpcError('invalid_params', zodIssues(parsed.error))
        return c.json(error.body, error.status)
      }

      const timer = await readTimer(workspaceId)
      const entries = await readEntries(workspaceId)
      const entry = stopRunningTimer(timer, entries)
      if (!entry) {
        const error = rpcError('timer_not_running', 'No timer is running', 400)
        return c.json(error.body, error.status)
      }

      await writeEntries(entries, workspaceId)
      const resetTimer: TimerState = {
        ...defaultTimer,
        lastProjectId: timer.projectId,
      }
      await writeJson(getTimerPath(workspaceId), resetTimer)

      const projects = await readProjects(workspaceId)
      const project = projects.find(
        (candidate) => candidate.id === entry.projectId,
      )
      const projectName = project?.name ?? 'an unknown project'
      const durationSeconds = entry.duration ?? 0

      return c.json({
        ok: true,
        result: {
          entry,
          timer: resetTimer,
          projectName,
          durationSeconds,
          durationText: speakableDuration(durationSeconds),
          summary: `Stopped the timer on ${projectName} after ${speakableDuration(durationSeconds)}${entry.description ? `, working on ${entry.description}` : ''}.`,
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Time Tracker does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Time Tracker RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'time_tracker_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Time Tracker could not complete the request.',
        },
      },
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
