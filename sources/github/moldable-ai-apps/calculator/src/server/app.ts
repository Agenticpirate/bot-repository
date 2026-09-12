import {
  generateId,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { CalcError, evaluate, formatResult } from '../lib/calc'
import type { HistoryEntry, HistoryKind } from '../lib/history'
import {
  CATEGORIES,
  type CategoryId,
  ConvertError,
  type RateTable,
  convert,
  unitSymbol,
} from '../lib/units'
import { getRates } from './rates'
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

const HISTORY_LIMIT = 500

const NATIVE_CONVERSION_PAIRS = [
  {
    value: 'length-km-mi',
    label: 'Length · Kilometres → miles',
    category: 'length',
    from: 'km',
    to: 'mi',
  },
  {
    value: 'length-mi-km',
    label: 'Length · Miles → kilometres',
    category: 'length',
    from: 'mi',
    to: 'km',
  },
  {
    value: 'mass-kg-lb',
    label: 'Mass · Kilograms → pounds',
    category: 'mass',
    from: 'kg',
    to: 'lb',
  },
  {
    value: 'mass-lb-kg',
    label: 'Mass · Pounds → kilograms',
    category: 'mass',
    from: 'lb',
    to: 'kg',
  },
  {
    value: 'temperature-c-f',
    label: 'Temperature · Celsius → Fahrenheit',
    category: 'temperature',
    from: 'C',
    to: 'F',
  },
  {
    value: 'temperature-f-c',
    label: 'Temperature · Fahrenheit → Celsius',
    category: 'temperature',
    from: 'F',
    to: 'C',
  },
] as const

function boundedExpression(value: string, maximumLength = 72): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Untitled result'
  return compact.length <= maximumLength
    ? compact
    : `${compact.slice(0, maximumLength - 1).trimEnd()}…`
}

function normalizeWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  try {
    return sanitizeId(value)
  } catch {
    return undefined
  }
}

function getRequestWorkspaceId(request: Request): string | undefined {
  return normalizeWorkspaceId(
    getWorkspaceFromRequest(request) ??
      request.headers.get('x-moldable-workspace-id'),
  )
}

function getHistoryPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'history.json')
}

async function readHistory(workspaceId?: string): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(getHistoryPath(workspaceId), [])
}

async function writeHistory(
  workspaceId: string | undefined,
  entries: HistoryEntry[],
): Promise<void> {
  await writeJson(getHistoryPath(workspaceId), entries.slice(0, HISTORY_LIMIT))
}

async function appendEntry(
  workspaceId: string | undefined,
  entry: {
    kind: HistoryKind
    expression: string
    result: string
    resultValue: number
  },
): Promise<HistoryEntry> {
  const history = await readHistory(workspaceId)
  const record: HistoryEntry = {
    id: generateId(),
    kind: entry.kind,
    expression: entry.expression,
    result: entry.result,
    resultValue: entry.resultValue,
    createdAt: new Date().toISOString(),
  }
  // Newest first.
  history.unshift(record)
  await writeHistory(workspaceId, history)
  return record
}

function nativeHistoryEntry(entry: HistoryEntry) {
  return {
    ...entry,
    expressionExcerpt: boundedExpression(entry.expression),
    displayLabel: `Open result: ${boundedExpression(entry.expression, 48)}`,
    deleteDisplayLabel: `Delete result: ${boundedExpression(entry.expression, 48)}`,
    kindLabel: entry.kind === 'calc' ? 'Calculation' : 'Conversion',
    createdLabel: new Date(entry.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

// ---------------------------------------------------------------------------
// UI intents (drive contract) — a single per-workspace slot the client polls
// ---------------------------------------------------------------------------

const UI_VIEW_IDS = ['calc', 'convert', 'history'] as const

type UiViewId = (typeof UI_VIEW_IDS)[number]

interface UiIntent {
  id: string
  view: UiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

/** Model-readable catalog of every navigable surface in the client UI. */
const UI_VIEWS: {
  id: UiViewId
  name: string
  description: string
  params?: Record<string, string>
}[] = [
  {
    id: 'calc',
    name: 'Calculator',
    description:
      'The keypad view for everyday and scientific math: type or tap an expression and evaluate it. Optional params.expression prefills the input buffer with an expression string. Optional entityId (a history entry id from calculator.ui.read or calculator.history.recent) loads that past calculation into the keypad instead.',
    params: {
      expression:
        'Optional expression string to prefill the keypad with, e.g. "2*(3+4)".',
    },
  },
  {
    id: 'convert',
    name: 'Convert',
    description:
      'The unit and currency conversion view: pick a category, enter a value, and choose from/to units. Optional params.category selects the active category: length, mass, temperature, volume, area, speed, data, time, or currency. Takes no entityId.',
    params: {
      category:
        'Optional category id: length, mass, temperature, volume, area, speed, data, time, or currency.',
    },
  },
  {
    id: 'history',
    name: 'History',
    description:
      'The slide-over panel listing past calculations and conversions, newest first, with search. Opens on top of whichever mode is active. Optional params.query prefills the history search box. Takes no entityId.',
    params: {
      query: 'Optional free-text search string to prefill the search box.',
    },
  },
]

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId?: string): Promise<UiIntent | null> {
  return readJson<UiIntent | null>(getUiIntentPath(workspaceId), null)
}

async function writeUiIntent(
  workspaceId: string | undefined,
  intent: UiIntent | null,
): Promise<void> {
  await writeJson(getUiIntentPath(workspaceId), intent)
}

/** Queue a navigation intent. Single slot: the newest intent replaces any unacked one. */
async function setUiIntent(
  workspaceId: string | undefined,
  input: {
    view: UiViewId
    entityId?: string
    params?: Record<string, unknown>
  },
): Promise<UiIntent> {
  const intent: UiIntent = {
    id: generateId(),
    view: input.view,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.params && Object.keys(input.params).length > 0
      ? { params: input.params }
      : {}),
    createdAt: new Date().toISOString(),
  }
  await writeUiIntent(workspaceId, intent)
  return intent
}

const angleModeSchema = z.enum(['deg', 'rad'])

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const evaluateParamsSchema = z.object({
  expression: z.string().min(1),
  angleMode: angleModeSchema.optional(),
  record: z.boolean().optional(),
})

const conversionCategorySchema = z.enum([
  'length',
  'mass',
  'temperature',
  'volume',
  'area',
  'speed',
  'data',
  'time',
  'currency',
])

const convertParamsSchema = z
  .object({
    value: z.number(),
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
    category: conversionCategorySchema.optional(),
    pair: z.string().min(1).optional(),
    record: z.boolean().optional(),
  })
  .refine((input) => input.pair || (input.from && input.to), {
    message: 'Choose a conversion pair or provide from and to units.',
  })

const recordEntrySchema = z.object({
  kind: z.enum(['calc', 'convert']),
  expression: z.string().min(1),
  result: z.string().min(1),
  resultValue: z.number(),
})

const recentParamsSchema = z
  .object({ limit: z.number().int().min(1).max(HISTORY_LIMIT).optional() })
  .optional()

const searchParamsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(HISTORY_LIMIT).optional(),
})

const historyDeleteParamsSchema = z.object({ id: z.string().min(1) })

const uiDescribeParamsSchema = z.object({}).optional()

const uiNavigateParamsSchema = z.object({
  view: z.enum(UI_VIEW_IDS),
  entityId: z.string().min(1).optional(),
  params: z.record(z.unknown()).optional(),
})

const uiShowHistoryParamsSchema = z.object({}).optional()

const uiReadParamsSchema = z
  .object({
    view: z.enum(UI_VIEW_IDS).optional(),
    entityId: z.string().min(1).optional(),
    query: z.string().optional(),
  })
  .optional()

function searchHistory(entries: HistoryEntry[], query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(
    (e) =>
      e.expression.toLowerCase().includes(q) ||
      e.result.toLowerCase().includes(q),
  )
}

async function parseJsonBody(c: { req: { json: () => Promise<unknown> } }) {
  try {
    return await c.req.json()
  } catch {
    return undefined
  }
}

function parseLimit(limitRaw: string | undefined): number | undefined {
  if (limitRaw === undefined) return undefined
  const limit = Number(limitRaw)
  if (!Number.isFinite(limit) || limit < 1) return undefined
  return Math.min(Math.floor(limit), HISTORY_LIMIT)
}

// Evaluate an expression and (optionally) record it, returning a uniform shape.
function runEvaluate(expression: string, mode: 'deg' | 'rad') {
  const value = evaluate(expression, mode)
  return {
    expression,
    value,
    formatted: formatResult(value),
  }
}

// Run a conversion and produce display-friendly labels.
function runConvert(
  value: number,
  from: string,
  to: string,
  category?: CategoryId,
  rates?: RateTable,
) {
  const res = convert(value, from, to, category, rates)
  const fromSym = unitSymbol(from)
  const toSym = unitSymbol(to)
  const expression = `${formatResult(value)} ${fromSym} → ${toSym}`
  const label = `${formatResult(res.result)} ${toSym}`
  return {
    value: res.value,
    from: res.from,
    to: res.to,
    category: res.category,
    resultValue: res.result,
    fromSym,
    toSym,
    expression,
    label,
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'calculator',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

// List history. Supports ?limit and ?q (search).
app.get('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const limitRaw = c.req.query('limit')
  const query = c.req.query('q')
  let entries = await readHistory(workspaceId)
  if (query) entries = searchHistory(entries, query)
  const limit = parseLimit(limitRaw)
  if (limit !== undefined) entries = entries.slice(0, limit)
  return c.json({ entries })
})

// Record a calculation or conversion the client already computed locally.
app.post('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const body = await parseJsonBody(c)
  const parsed = recordEntrySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid history entry' }, 400)
  }
  const record = await appendEntry(workspaceId, parsed.data)
  return c.json(record, 201)
})

// Delete one entry.
app.delete('/api/history/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const history = await readHistory(workspaceId)
  const next = history.filter((e) => e.id !== id)
  if (next.length === history.length) {
    return c.json({ error: 'Not found' }, 404)
  }
  await writeHistory(workspaceId, next)
  return c.json({ ok: true })
})

// Clear all history.
app.delete('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  await writeHistory(workspaceId, [])
  return c.json({ ok: true })
})

// Expose conversion categories so the client can render selectors without
// duplicating the table.
app.get('/api/categories', (c) => {
  return c.json({ categories: CATEGORIES })
})

// Live currency exchange rates (units per 1 USD), cached per workspace.
app.get('/api/rates', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  try {
    const payload = await getRates(workspaceId)
    return c.json(payload, 200, { 'Cache-Control': 'no-store' })
  } catch {
    return c.json(
      { error: 'Live exchange rates are currently unavailable.' },
      503,
    )
  }
})

// UI intent slot (drive contract). The client fetches the current intent and
// acks it by id once the navigation has been applied visibly.
app.get('/api/moldable/ui-intent', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    return c.json(intent, 200, { 'Cache-Control': 'no-store' })
  } catch (error) {
    console.error('Failed to read UI intent:', error)
    return c.json({ error: 'Failed to read UI intent' }, 500)
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id?.trim()) {
      return c.json({ error: 'Missing id query parameter' }, 400)
    }
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    const cleared = intent?.id === id
    if (cleared) await writeUiIntent(workspaceId, null)
    return c.json({ ok: true, cleared })
  } catch (error) {
    console.error('Failed to ack UI intent:', error)
    return c.json({ error: 'Failed to ack UI intent' }, 500)
  }
})

// Today contribution. Calculator is a tool, not a source of obligations, so it
// is quiet by default. The single thing worth a glanceable "resume" is the last
// calculation done *today* — letting you pick the running thread back up. Stale
// (> 24h) history stays silent.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  try {
    const history = await readHistory(workspaceId)
    const latest = history[0]
    if (!latest) {
      return c.json({
        items: [],
        resume: null,
        generatedAt: new Date().toISOString(),
      })
    }

    const ageMs = Date.now() - Date.parse(latest.createdAt)
    if (!Number.isFinite(ageMs) || ageMs > 24 * 60 * 60 * 1000) {
      return c.json({
        items: [],
        resume: null,
        generatedAt: new Date().toISOString(),
      })
    }

    const resume = {
      title: `${latest.expression} = ${latest.result}`,
      subtitle:
        latest.kind === 'convert' ? 'Last conversion' : 'Last calculation',
      icon: '🧮',
      lastTouchedAt: latest.createdAt,
    }

    return c.json({
      items: [],
      resume,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

// App-to-app RPC surface. Mirrors the capabilities declared in moldable.json.
app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  let body: z.infer<typeof rpcRequestSchema>
  try {
    body = rpcRequestSchema.parse(await c.req.json())
  } catch {
    return c.json(
      {
        ok: false,
        error: { code: 'bad_request', message: 'Invalid RPC request.' },
      },
      400,
    )
  }

  try {
    if (
      body.method === 'calculator.cards.present' ||
      body.method === 'calculator.cards.read'
    ) {
      const input = z
        .object({
          expression: z.string().min(1).max(2000),
          angleMode: angleModeSchema.default('deg'),
        })
        .strict()
        .parse(body.params)
      const result = runEvaluate(input.expression, input.angleMode)
      if (body.method === 'calculator.cards.read')
        return c.json({
          ok: true,
          result: { ...result, angleMode: input.angleMode },
        })
      return c.json({
        ok: true,
        result: {
          appCard: {
            version: 1,
            title: 'Calculation',
            resourcePath: '/index.html?card=calculation',
            input,
            readMethod: 'calculator.cards.read',
            actions: [],
            height: 320,
          },
        },
      })
    }

    if (body.method === 'calculator.compute.evaluate') {
      const params = evaluateParamsSchema.parse(body.params)
      const evald = runEvaluate(params.expression, params.angleMode ?? 'deg')
      if (params.record !== false) {
        await appendEntry(workspaceId, {
          kind: 'calc',
          expression: params.expression,
          result: evald.formatted,
          resultValue: evald.value,
        })
      }
      const recentEntries = (await readHistory(workspaceId))
        .slice(0, 5)
        .map(nativeHistoryEntry)
      return c.json({
        ok: true,
        result: {
          expression: evald.expression,
          result: evald.value,
          formatted: evald.formatted,
          resultPanels: [
            {
              label: 'Result',
              value: evald.formatted,
              detail: evald.expression,
            },
          ],
          emptyStates: [],
          successNotices: [
            {
              title: 'Calculated',
              message:
                params.record === false
                  ? 'Result is ready.'
                  : 'Result is ready and saved to history.',
            },
          ],
          recentEntries,
          recentSections:
            recentEntries.length > 0
              ? [{ title: 'Recent', subtitle: 'Saved automatically' }]
              : [],
        },
      })
    }

    if (body.method === 'calculator.convert.units') {
      const params = convertParamsSchema.parse(body.params)
      const selectedPair = params.pair
        ? NATIVE_CONVERSION_PAIRS.find((pair) => pair.value === params.pair)
        : undefined
      if (params.pair && !selectedPair) {
        throw new ConvertError(`Unknown conversion pair "${params.pair}"`)
      }
      const from = selectedPair?.from ?? params.from!
      const to = selectedPair?.to ?? params.to!
      const category = selectedPair?.category ?? params.category
      // Currency needs live rates; other categories convert offline.
      const isCurrency =
        category === 'currency' ||
        (!category &&
          CATEGORIES.find((c) => c.id === 'currency')?.units.some(
            (u) => u.id === from,
          ))
      const rates = isCurrency ? (await getRates(workspaceId)).rates : undefined
      const conv = runConvert(params.value, from, to, category, rates)
      if (params.record !== false) {
        await appendEntry(workspaceId, {
          kind: 'convert',
          expression: conv.expression,
          result: conv.label,
          resultValue: conv.resultValue,
        })
      }
      const recentEntries = (await readHistory(workspaceId))
        .slice(0, 5)
        .map(nativeHistoryEntry)
      return c.json({
        ok: true,
        result: {
          value: conv.value,
          from: conv.from,
          to: conv.to,
          category: conv.category,
          result: conv.resultValue,
          formatted: conv.label,
          resultPanels: [
            {
              label: 'Converted value',
              value: conv.label,
              detail: conv.expression,
            },
          ],
          emptyStates: [],
          successNotices: [
            {
              title: 'Converted',
              message:
                params.record === false
                  ? 'Conversion is ready.'
                  : 'Conversion is ready and saved to history.',
            },
          ],
          recentEntries,
          recentSections:
            recentEntries.length > 0
              ? [{ title: 'Recent', subtitle: 'Saved automatically' }]
              : [],
        },
      })
    }

    if (body.method === 'calculator.history.recent') {
      const params = recentParamsSchema.parse(body.params)
      const history = await readHistory(workspaceId)
      return c.json({ ok: true, result: history.slice(0, params?.limit ?? 20) })
    }

    if (body.method === 'calculator.history.search') {
      const params = searchParamsSchema.parse(body.params)
      const history = await readHistory(workspaceId)
      const matches = searchHistory(history, params.query).slice(
        0,
        params.limit ?? 20,
      )
      return c.json({ ok: true, result: matches })
    }

    if (body.method === 'calculator.history.delete') {
      const params = historyDeleteParamsSchema.parse(body.params)
      const history = await readHistory(workspaceId)
      const next = history.filter((entry) => entry.id !== params.id)
      if (next.length === history.length) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'not_found',
              message: `No history entry with id ${params.id}.`,
            },
          },
          404,
        )
      }
      await writeHistory(workspaceId, next)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    if (body.method === 'calculator.history.clear') {
      await writeHistory(workspaceId, [])
      return c.json({ ok: true, result: { cleared: true } })
    }

    if (body.method === 'calculator.ui.describe') {
      uiDescribeParamsSchema.parse(body.params)
      return c.json({ ok: true, result: { views: UI_VIEWS } })
    }

    if (body.method === 'calculator.ui.navigate') {
      const params = uiNavigateParamsSchema.parse(body.params)
      const intentParams: Record<string, unknown> = { ...(params.params ?? {}) }
      if (params.entityId) {
        const history = await readHistory(workspaceId)
        const entry = history.find((e) => e.id === params.entityId)
        if (!entry) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'not_found',
                message: `No history entry with id ${params.entityId}.`,
              },
            },
            404,
          )
        }
        // Resolve the entry into a keypad seed so the client can apply the
        // navigation without a second lookup (mirrors the History "reuse" tap).
        if (
          params.view === 'calc' &&
          typeof intentParams.expression !== 'string'
        ) {
          intentParams.expression =
            entry.kind === 'calc' ? entry.expression : String(entry.resultValue)
        }
      }
      if (
        params.view === 'convert' &&
        intentParams.category !== undefined &&
        !CATEGORIES.some((cat) => cat.id === intentParams.category)
      ) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_params',
              message: `Unknown conversion category: ${String(intentParams.category)}`,
            },
          },
          400,
        )
      }
      const intent = await setUiIntent(workspaceId, {
        view: params.view,
        entityId: params.entityId,
        params: intentParams,
      })
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'calculator.ui.showHistory') {
      uiShowHistoryParamsSchema.parse(body.params)
      const intent = await setUiIntent(workspaceId, { view: 'history' })
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'calculator.ui.read') {
      const params = uiReadParamsSchema.parse(body.params) ?? {}
      const history = await readHistory(workspaceId)
      if (params.entityId) {
        const entry = history.find((e) => e.id === params.entityId)
        if (!entry) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'not_found',
                message: `No history entry with id ${params.entityId}.`,
              },
            },
            404,
          )
        }
        return c.json({
          ok: true,
          result: {
            entry: nativeHistoryEntry(entry),
            emptyStates: [],
          },
        })
      }
      const view = params.view ?? 'history'
      if (view === 'calc' || view === 'convert') {
        return c.json({
          ok: true,
          result: {
            view,
            ...(view === 'convert'
              ? {
                  draft: {
                    value: 1,
                    conversionPair: [NATIVE_CONVERSION_PAIRS[0].value],
                  },
                  conversionOptions: NATIVE_CONVERSION_PAIRS.map(
                    ({ value, label }) => ({ value, label }),
                  ),
                }
              : {}),
            resultPanels: [],
            successNotices: [],
            emptyStates: [
              {
                title:
                  view === 'calc' ? 'Ready to calculate' : 'Ready to convert',
                description:
                  view === 'calc'
                    ? 'Enter an expression, choose the angle mode, then calculate.'
                    : 'Choose a common conversion pair, set a value, then convert.',
              },
            ],
            recentEntries: history.slice(0, 5).map(nativeHistoryEntry),
            recentSections:
              history.length > 0
                ? [{ title: 'Recent', subtitle: 'Saved automatically' }]
                : [],
          },
        })
      }
      const entries = params.query
        ? searchHistory(history, params.query)
        : history
      return c.json({
        ok: true,
        result: {
          view,
          entries: entries.map(nativeHistoryEntry),
          queryLabel: params.query?.trim()
            ? `Results for “${params.query.trim()}”`
            : 'All calculations',
          clearActions:
            history.length > 0
              ? [
                  {
                    label: 'Clear calculation history',
                    count: history.length,
                  },
                ]
              : [],
          emptyStates:
            entries.length === 0
              ? [
                  {
                    title: params.query
                      ? 'No matching calculations'
                      : 'No calculations yet',
                    description: params.query
                      ? 'Try a different expression or result.'
                      : 'Your calculations and conversions will appear here.',
                  },
                ]
              : [],
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Unknown method: ${body.method}`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof CalcError || error instanceof ConvertError) {
      return c.json(
        { ok: false, error: { code: 'invalid_input', message: error.message } },
        400,
      )
    }
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: error.issues[0]?.message ?? 'Invalid params.',
          },
        },
        400,
      )
    }
    console.error('RPC error:', error)
    return c.json(
      {
        ok: false,
        error: { code: 'internal_error', message: 'Calculator RPC failed.' },
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
