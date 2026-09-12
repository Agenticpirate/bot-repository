import {
  WORKSPACE_HEADER,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { Context, Hono } from 'hono'

type JsonErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503

type TodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type TodayDismissal = {
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

export function getWorkspaceId(c: Context): string | undefined {
  return getWorkspaceFromRequest(c.req.raw)
}

export function getDataDir(c: Context): string {
  return getAppDataDir(getWorkspaceId(c))
}

export function jsonError(
  c: Context,
  message: string,
  status: JsonErrorStatus = 500,
) {
  return c.json({ error: message }, status)
}

export function installTodayDismissalRoutes(app: Hono): void {
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
    if (!isTodayResponse(data)) return

    const dismissals = await readTodayDismissals(c)
    const items = filterDismissedTodayItems(data.items, dismissals)
    if (items.length === data.items.length) return

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    c.res = new Response(JSON.stringify({ ...data, items }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })

  app.post('/api/moldable/today/dismiss', async (c) => {
    const body = (await c.req.json().catch(() => null)) as unknown
    if (!isTodayDismissal(body)) {
      return jsonError(c, 'Invalid Today dismissal payload.', 400)
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
}

function todayDismissalsPath(c: Context): string {
  return safePath(getDataDir(c), 'today-dismissals.json')
}

async function readTodayDismissals(c: Context): Promise<TodayDismissal[]> {
  const data = await readJson<unknown>(todayDismissalsPath(c), [])
  return Array.isArray(data) ? data.filter(isTodayDismissal) : []
}

async function recordTodayDismissal(
  c: Context,
  dismissal: TodayDismissal,
): Promise<TodayDismissal[]> {
  const current = await readTodayDismissals(c)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))

  await writeJson(todayDismissalsPath(c), next)
  return next
}

function filterDismissedTodayItems<T extends TodayItem>(
  items: T[],
  dismissals: TodayDismissal[],
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
    return !dismissedMaterialKeys.has(todayMaterialKey(item))
  })
}

function todayMaterialKey(item: TodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? 'chess',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeTodayText(item.title),
    normalizeTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isTodayResponse(value: unknown): value is {
  items: TodayItem[]
  [key: string]: unknown
} {
  return isRecord(value) && Array.isArray(value.items)
}

function isTodayDismissal(value: unknown): value is TodayDismissal {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
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

export async function completion(body: Record<string, unknown>) {
  const aiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
  const appId = process.env.MOLDABLE_APP_ID
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!aiServerUrl || !appId || !appToken) {
    throw new Error('Moldable AI server environment is not configured')
  }

  const res = await fetch(`${aiServerUrl}/api/llm/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-app-id': appId,
      'x-moldable-app-token': appToken,
    },
    body: JSON.stringify({
      appId,
      ...body,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM completion failed with status ${res.status}`)
  }

  return res.json() as Promise<{ text: string; model: string; usage?: unknown }>
}

export async function generateJson<T = unknown>(body: Record<string, unknown>) {
  const aiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
  const appId = process.env.MOLDABLE_APP_ID
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!aiServerUrl || !appId || !appToken) {
    throw new Error('Moldable AI server environment is not configured')
  }

  const requestedTimeout =
    typeof body.timeoutMs === 'number' && Number.isFinite(body.timeoutMs)
      ? body.timeoutMs
      : 45_000
  const timeoutMs = Math.min(60_000, Math.max(1, requestedTimeout))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${aiServerUrl}/api/llm/generate-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-moldable-app-id': appId,
        'x-moldable-app-token': appToken,
      },
      body: JSON.stringify({
        appId,
        ...body,
      }),
      signal: controller.signal,
    })

    const result = (await res.json()) as {
      json?: T
      model?: string
      usage?: unknown
      error?: string
    }
    if (!res.ok || !result.json) {
      throw new Error(
        result.error ?? `LLM JSON generation failed with status ${res.status}`,
      )
    }

    return {
      json: result.json,
      model: result.model ?? 'unknown',
      usage: result.usage,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export { WORKSPACE_HEADER }
