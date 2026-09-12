import { moneyRoutes } from './money-routes'
import {
  filterDismissedTodayItems,
  readConnections,
  readTodayDismissals,
  recordTodayDismissal,
} from './money-storage'
import { plaidRoutes } from './plaid'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())
app.route('/', plaidRoutes)
app.route('/', moneyRoutes)

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'money',
    status: 'ok',
    appUrl: process.env.MOLDABLE_APP_URL ?? null,
  })
})

app.get('/api/moldable/today', async (c) => {
  const dismissals = await readTodayDismissals(c)
  return c.json({
    items: filterDismissedTodayItems([], dismissals),
    resume: null,
    generatedAt: new Date().toISOString(),
  })
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!isTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordTodayDismissal(c, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

app.get('/api/connections', async (c) => {
  const connections = await readConnections(c)
  return c.json(connections)
})

function isTodayDismissalRequest(value: unknown): value is {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt?: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
} {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return false
  }
  return (
    optionalString(value.dismissalKey) &&
    optionalString(value.materialDismissalKey) &&
    optionalString(value.dismissedAt) &&
    (value.item === undefined || isTodayDismissalItem(value.item))
  )
}

function isTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isRecord(value)) return false
  return (
    optionalString(value.kind) &&
    optionalString(value.title) &&
    optionalString(value.subtitle) &&
    optionalString(value.groupHint)
  )
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
