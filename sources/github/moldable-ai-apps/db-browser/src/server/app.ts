import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import type { Dashboard, DashboardChart } from '../shared/types'
import type { QueryResultResponse } from '../shared/types'
import {
  appendQueryHistory,
  createDashboard,
  createDashboardChart,
  createSqlWorkspaceTab,
  describeTable,
  editSqlWorkspaceTab,
  exportReadOnlyQuery,
  getDashboardWorkspace,
  getExplorer,
  getPreferences,
  getSqlWorkspace,
  importRows,
  listConnections,
  listQueryHistory,
  parseConnectionInput,
  previewTable,
  removeConnection,
  removeDashboard,
  removeDashboardChart,
  resolveConnectionId,
  runReadOnlyQuery,
  runSqlStatement,
  saveConnection,
  saveDashboardWorkspace,
  savePreferences,
  saveSqlWorkspace,
  searchSchema,
  selectDashboard,
  selectSqlWorkspaceTab,
  testConnection,
  testSavedConnection,
  updateConnection,
  updateDashboard,
  updateDashboardChart,
  updateSqlWorkspaceTab,
} from './db'
import { getDataDir, getWorkspaceId, jsonError } from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

type ZodParser<T> = {
  strict(): ZodParser<T>
  parse(value: unknown): T
  optional(): ZodParser<T | undefined>
}
type ZodStringParser = ZodParser<string> & {
  trim(): ZodStringParser
  min(value: number): ZodStringParser
  max(value: number): ZodStringParser
}
type ZodShape = Record<string, ZodParser<unknown>>
type ParsedShape<T extends ZodShape> = {
  [K in keyof T]: T[K] extends ZodParser<infer V> ? V : never
}
type ZodApi = {
  boolean(): ZodParser<boolean>
  string(): ZodStringParser
  unknown(): ZodParser<unknown>
  enum<const T extends readonly [string, ...string[]]>(
    values: T,
  ): ZodParser<T[number]>
  object<T extends ZodShape>(shape: T): ZodParser<ParsedShape<T>>
  record<T>(
    key: ZodParser<string>,
    value: ZodParser<T>,
  ): ZodParser<Record<string, T>>
}

const requireFromMoldableUi = createRequire(
  import.meta.resolve('@moldable-ai/ui'),
)
const { z } = requireFromMoldableUi('zod') as { z: ZodApi }

export const app = new Hono()

app.use('/api/*', cors())

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
function requiredWorkspaceId(workspaceId?: string) {
  return workspaceId ?? 'personal'
}

type RpcStatus = 400 | 404 | 409 | 500

const DB_UI_VIEWS = ['connections', 'table', 'query', 'dashboard'] as const
type DbUiView = (typeof DB_UI_VIEWS)[number]
type DbUiIntent = {
  id: string
  view: DbUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
type DbDriveState = Omit<DbUiIntent, 'id' | 'createdAt'> & {
  lastQueryResult?: {
    connectionId: string
    sql: string
    result: QueryResultResponse
  }
}

const uiDescribeParamsSchema = z.object({})
const uiNavigateParamsSchema = z.object({
  view: z.enum(DB_UI_VIEWS),
  entityId: z.string().trim().min(1).max(512).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
const uiOpenTableParamsSchema = z.object({
  table: z.string().trim().min(1).max(512),
})
const uiReadParamsSchema = z.object({
  view: z.enum(DB_UI_VIEWS).optional(),
  entityId: z.string().trim().min(1).max(512).optional(),
})
const queryRunParamsSchema = z.object({
  connectionId: z.string().trim().min(1).max(200).optional(),
  sql: z.string().trim().min(1).max(250_000),
})

const DB_UI_DESCRIPTIONS = [
  {
    id: 'connections',
    name: 'Connections',
    description:
      'The saved database connection picker and settings. Takes no entityId.',
  },
  {
    id: 'table',
    name: 'Table preview',
    description:
      'Open a table or view and show its bounded row preview. entityId is schema.table; an unqualified table name is accepted only when unique.',
  },
  {
    id: 'query',
    name: 'SQL workspace',
    description:
      'Show the saved read-only SQL editor tabs and most recent query result. Optional entityId is a saved SQL tab id.',
  },
  {
    id: 'dashboard',
    name: 'Dashboard workspace',
    description:
      'Show saved analytics dashboards. Optional entityId is a dashboard id.',
  },
] satisfies Array<{ id: DbUiView; name: string; description: string }>

function uiIntentPath(dataDir: string) {
  return safePath(dataDir, 'ui-intent.json')
}

function driveStatePath(dataDir: string) {
  return safePath(dataDir, 'drive-state.json')
}

async function readUiIntent(dataDir: string): Promise<DbUiIntent | null> {
  return readJson<DbUiIntent | null>(uiIntentPath(dataDir), null)
}

async function setUiIntent(
  dataDir: string,
  target: Omit<DbUiIntent, 'id' | 'createdAt'>,
) {
  const intent: DbUiIntent = {
    ...target,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await Promise.all([
    writeJson(uiIntentPath(dataDir), intent),
    writeJson(driveStatePath(dataDir), target),
  ])
  return intent
}

async function resolveTableTarget(
  workspaceId: string,
  dataDir: string,
  tableInput: string,
  preferences: Awaited<ReturnType<typeof getPreferences>>,
) {
  const connectionId = await resolveConnectionId(
    workspaceId,
    dataDir,
    preferences.activeConnectionId,
  )
  const schemas = await getExplorer(
    workspaceId,
    dataDir,
    connectionId,
    preferences.queryTimeoutMs,
  )
  const dot = tableInput.indexOf('.')
  const requestedSchema = dot > 0 ? tableInput.slice(0, dot) : null
  const requestedTable = dot > 0 ? tableInput.slice(dot + 1) : tableInput
  const matches = schemas.flatMap((schema) =>
    schema.tables
      .filter(
        (table) =>
          table.name === requestedTable &&
          (!requestedSchema || schema.name === requestedSchema),
      )
      .map((table) => ({
        connectionId,
        schema: schema.name,
        table: table.name,
        type: table.type,
      })),
  )
  if (matches.length === 0) throw new Error(`Table ${tableInput} not found`)
  if (matches.length > 1) {
    const error = new Error(
      `Table ${tableInput} is ambiguous; use schema.table`,
    )
    error.name = 'AmbiguousTable'
    throw error
  }
  return matches[0]
}

function isZodError(error: unknown): error is { issues: unknown[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray(error.issues)
  )
}

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
      },
    },
  }
}

function paramsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function ensureSqlTerminator(sql: string) {
  const trimmedEnd = sql.trimEnd()
  if (!trimmedEnd) return ''
  return trimmedEnd.endsWith(';') ? trimmedEnd : `${trimmedEnd};`
}

function queryHistoryTitle(sql: string) {
  return sql.split('\n')[0]?.trim().slice(0, 80) || 'SQL query'
}

function nativeCellText(value: unknown): string {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  return text.length > 240 ? `${text.slice(0, 237)}…` : text
}

function nativeDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'Unknown'
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function boundedDashboardSql(sql: string) {
  const statement = sql.trim().replace(/;+$/, '')
  if (!statement) throw new Error('Chart SQL is empty')
  return `select * from (${statement}) as moldable_native_chart limit 64;`
}

function firstNumericColumn(
  rows: Record<string, unknown>[],
  columns: string[],
) {
  return columns.find((column) =>
    rows.some((row) => Number.isFinite(Number(row[column]))),
  )
}

async function projectNativeDashboard(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  dashboard: Dashboard,
  timeoutMs: number,
) {
  const metricCharts: Array<{
    label: string
    value: string
    detail: string
  }> = []
  const tableCharts: Array<{
    columns: string[]
    rows: string[][]
    caption: string
  }> = []
  const chartCharts: Array<{
    title: string
    values: number[]
    labels: string[]
    style: 'line' | 'area' | 'bar'
  }> = []
  const unsupportedCharts: Array<{
    title: string
    subtitle: string
    metadata: string
  }> = []
  const notices: Array<{ title: string; message: string; tone: string }> = []

  for (const chart of dashboard.charts.slice(0, 12)) {
    if (
      chart.type !== 'number' &&
      chart.type !== 'table' &&
      chart.type !== 'line' &&
      chart.type !== 'area' &&
      chart.type !== 'bar'
    ) {
      unsupportedCharts.push({
        title: chart.title || 'Untitled chart',
        subtitle: chart.type || 'Unknown chart type',
        metadata: 'View this chart on Mac',
      })
      continue
    }
    try {
      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        boundedDashboardSql(chart.sql),
        timeoutMs,
      )
      const rows = result.rows.slice(0, 64)
      if (chart.type === 'number') {
        const column =
          chart.metricColumn ||
          firstNumericColumn(rows, result.columns) ||
          result.columns[0]
        metricCharts.push({
          label: chart.title || 'Metric',
          value: nativeCellText(column ? rows[0]?.[column] : ''),
          detail: chart.description?.trim() || column || 'Saved number chart',
        })
        continue
      }
      if (chart.type === 'table') {
        const requested = (chart.tableColumns ?? []).filter((column) =>
          result.columns.includes(column),
        )
        const columns = (
          requested.length > 0 ? requested : result.columns
        ).slice(0, 8)
        tableCharts.push({
          columns,
          rows: rows.map((row) =>
            columns.map((column) => nativeCellText(row[column])),
          ),
          caption: `${chart.title || 'Table'} · ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`,
        })
        continue
      }
      const labelColumn =
        chart.xAxis || chart.categoryColumn || result.columns[0]
      const valueColumn =
        chart.series?.[0]?.column ||
        firstNumericColumn(
          rows,
          result.columns.filter((column) => column !== labelColumn),
        )
      const points = valueColumn
        ? rows
            .map((row) => ({
              label: nativeCellText(row[labelColumn]),
              value: Number(row[valueColumn]),
            }))
            .filter((point) => Number.isFinite(point.value))
        : []
      if (points.length === 0) {
        notices.push({
          title: chart.title || 'Chart unavailable',
          message: 'The saved result did not contain a bounded numeric series.',
          tone: 'warning',
        })
        continue
      }
      chartCharts.push({
        title: chart.title || 'Chart',
        labels: points.map((point) => point.label),
        values: points.map((point) => point.value),
        style: chart.type,
      })
    } catch (error) {
      notices.push({
        title: chart.title || 'Chart unavailable',
        message:
          error instanceof Error
            ? error.message.slice(0, 240)
            : 'The saved chart could not be loaded.',
        tone: 'error',
      })
    }
  }

  const chartCount = dashboard.charts.length
  return {
    countLabel: `${chartCount} ${chartCount === 1 ? 'chart' : 'charts'}`,
    metricCharts,
    tableCharts,
    lineCharts: chartCharts.filter((chart) => chart.style === 'line'),
    areaCharts: chartCharts.filter((chart) => chart.style === 'area'),
    barCharts: chartCharts.filter((chart) => chart.style === 'bar'),
    unsupportedCharts,
    notices,
    emptyStates:
      chartCount === 0
        ? [
            {
              title: 'No charts',
              description: 'Add charts to this dashboard on Mac.',
            },
          ]
        : [],
    truncationNote:
      chartCount > 12
        ? `Showing 12 of ${chartCount.toLocaleString()} charts.`
        : '',
  }
}

function normalizedLookup(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, ' ')
}

function titleMatches(title: string, query: string) {
  return normalizedLookup(title) === normalizedLookup(query)
}

function previewSql(
  schema: string,
  table: string,
  limit: number,
  offset: number,
) {
  const base = `select * from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} limit ${limit}`
  return ensureSqlTerminator(offset > 0 ? `${base} offset ${offset}` : base)
}

async function resolveRpcConnectionId(
  workspaceId: string,
  dataDir: string,
  params: Record<string, unknown>,
) {
  return resolveConnectionId(workspaceId, dataDir, params.connectionId)
}

function resolveNamedDashboard(
  workspace: { activeDashboardId: string | null; dashboards: Dashboard[] },
  params: Record<string, unknown>,
) {
  const dashboardId =
    typeof params.dashboardId === 'string' ? params.dashboardId.trim() : ''
  if (dashboardId) return dashboardId

  const dashboardName =
    typeof params.dashboardName === 'string'
      ? params.dashboardName.trim()
      : typeof params.currentDashboardTitle === 'string'
        ? params.currentDashboardTitle.trim()
        : ''
  if (dashboardName) {
    const matches = workspace.dashboards.filter((dashboard) =>
      titleMatches(dashboard.title, dashboardName),
    )
    if (matches.length === 1) return matches[0].id
    if (matches.length > 1) {
      throw new Error(
        `Multiple dashboards are named "${dashboardName}". Use dashboardId.`,
      )
    }
    throw new Error(`Dashboard "${dashboardName}" not found`)
  }

  if (workspace.activeDashboardId) return workspace.activeDashboardId
  if (workspace.dashboards.length === 1) return workspace.dashboards[0].id
  throw new Error('Dashboard id or dashboardName is required')
}

function resolveNamedChart(
  dashboard: Dashboard,
  params: Record<string, unknown>,
) {
  const chartId =
    typeof params.chartId === 'string' ? params.chartId.trim() : ''
  if (chartId) return chartId

  const chartName =
    typeof params.chartName === 'string'
      ? params.chartName.trim()
      : typeof params.currentChartTitle === 'string'
        ? params.currentChartTitle.trim()
        : ''
  if (!chartName) throw new Error('Chart id or chartName is required')

  const matches = dashboard.charts.filter((chart) =>
    titleMatches(chart.title, chartName),
  )
  if (matches.length === 1) return matches[0].id
  if (matches.length > 1) {
    throw new Error(`Multiple charts are named "${chartName}". Use chartId.`)
  }
  throw new Error(`Chart "${chartName}" not found`)
}

async function resolveRpcDashboardId(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  params: Record<string, unknown>,
) {
  const workspace = await getDashboardWorkspace(
    workspaceId,
    dataDir,
    connectionId,
  )
  return resolveNamedDashboard(workspace, params)
}

async function resolveRpcDashboardAndChartId(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  params: Record<string, unknown>,
) {
  const workspace = await getDashboardWorkspace(
    workspaceId,
    dataDir,
    connectionId,
  )
  const dashboardId = resolveNamedDashboard(workspace, params)
  const dashboard = workspace.dashboards.find((item) => item.id === dashboardId)
  if (!dashboard) throw new Error('Dashboard not found')

  return {
    dashboardId,
    chartId: resolveNamedChart(dashboard, params),
    dashboard,
  }
}

function editDashboardChartSql(
  chart: DashboardChart,
  params: Record<string, unknown>,
) {
  const oldString = typeof params.oldString === 'string' ? params.oldString : ''
  const newString = typeof params.newString === 'string' ? params.newString : ''
  const replaceAll = params.replaceAll === true

  if (!oldString) throw new Error('oldString is required')

  const occurrences = chart.sql.split(oldString).length - 1
  if (occurrences === 0) throw new Error('oldString was not found in chart SQL')
  if (occurrences > 1 && !replaceAll) {
    throw new Error('oldString occurs multiple times. Set replaceAll to true.')
  }

  return {
    ...chart,
    sql: replaceAll
      ? chart.sql.replaceAll(oldString, newString)
      : chart.sql.replace(oldString, newString),
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'db-browser',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)

    const connections = await listConnections(workspaceId, dataDir)
    if (connections.length === 0) {
      return c.json({ items, resume, generatedAt })
    }

    const connectionId = await resolveConnectionId(workspaceId, dataDir)
    const [workspace, dashboardWorkspace] = await Promise.all([
      getSqlWorkspace(workspaceId, dataDir, connectionId),
      getDashboardWorkspace(workspaceId, dataDir, connectionId),
    ])
    const activeTab =
      workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null
    const activeDashboard =
      dashboardWorkspace.dashboards.find(
        (d) => d.id === dashboardWorkspace.activeDashboardId,
      ) ?? null

    // Resume whichever the user touched most recently: the dashboard they were
    // viewing (e.g. "Daily Analytics") or an in-progress SQL query tab.
    const candidates: { resume: Record<string, unknown>; ts: number }[] = []

    if (activeDashboard) {
      const n = activeDashboard.charts.length
      candidates.push({
        resume: {
          title: activeDashboard.title.trim() || 'Untitled dashboard',
          subtitle: n > 0 ? `${n} chart${n === 1 ? '' : 's'}` : 'Dashboard',
          icon: '📊',
          lastTouchedAt: activeDashboard.updatedAt,
        },
        ts: Date.parse(activeDashboard.updatedAt) || 0,
      })
    }

    if (activeTab && activeTab.sql.trim()) {
      const tabTitle = activeTab.title.trim() || 'Untitled query'
      const connection =
        connections.find((item) => item.id === connectionId) ?? null
      const connectionLabel = connection
        ? connection.environment
          ? `${connection.name} · ${connection.environment}`
          : connection.name
        : null

      const history = await listQueryHistory(workspaceId, dataDir, connectionId)
      const lastRun = history.find(
        (entry) =>
          entry.rowCount != null && titleMatches(entry.title, tabTitle),
      )
      const rowCount = lastRun?.rowCount ?? null
      const rowLabel =
        rowCount != null
          ? `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'}`
          : null

      const subtitle =
        [rowLabel, connectionLabel].filter(Boolean).join(' · ') || undefined

      candidates.push({
        resume: {
          title: tabTitle,
          ...(subtitle ? { subtitle } : {}),
          icon: '🗂️',
          lastTouchedAt: activeTab.updatedAt,
        },
        ts: Date.parse(activeTab.updatedAt) || 0,
      })
    }

    candidates.sort((a, b) => b.ts - a.ts)
    resume = candidates[0]?.resume ?? null

    return c.json({ items, resume, generatedAt })
  } catch {
    return c.json({ items: [], resume: null, generatedAt })
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  return c.json(await readUiIntent(getDataDir(c)), 200, {
    'Cache-Control': 'no-store',
  })
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const id = c.req.query('id')
  if (!id) return jsonError(c, 'An intent id is required', 400)
  const dataDir = getDataDir(c)
  const current = await readUiIntent(dataDir)
  const deleted = current?.id === id
  if (deleted) await writeJson(uiIntentPath(dataDir), null)
  return c.json({ ok: true, deleted })
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
  const dataDir = getDataDir(c)

  try {
    const body = paramsObject(await c.req.json().catch(() => ({})))
    const method = typeof body.method === 'string' ? body.method : ''
    const params = paramsObject(body.params)
    const preferences = await getPreferences(dataDir)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (
      method === 'db-browser.cards.present' ||
      method === 'db-browser.cards.read'
    ) {
      const input = z
        .object({
          connectionId: z.string().min(1).max(256),
          schema: z.string().min(1).max(256),
          table: z.string().min(1).max(256),
          detail: z.boolean().optional(),
        })
        .strict()
        .parse(params)
      const connectionId = await resolveConnectionId(
        workspaceId,
        dataDir,
        input.connectionId,
      )
      if (method === 'db-browser.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: `${input.schema}.${input.table}`.slice(0, 240),
              resourcePath: '/index.html?card=preview',
              input: {
                connectionId,
                schema: input.schema,
                table: input.table,
              },
              readMethod: 'db-browser.cards.read',
              actions: [],
              height: 360,
            },
          },
        })
      const table = await previewTable(
        workspaceId,
        dataDir,
        connectionId,
        input.schema,
        input.table,
        input.detail ? 40 : 4,
        0,
        preferences.queryTimeoutMs,
      )
      const columns = table.columns
        .slice(0, input.detail ? 12 : 3)
        .map((column) => column.name)
      const rows = table.rows.map((row) =>
        columns.map((column) => {
          const value = row[column]
          return value === null
            ? 'NULL'
            : typeof value === 'object'
              ? '[Structured value]'
              : String(value ?? '').slice(0, 80)
        }),
      )
      const result = {
        title: `${input.schema}.${input.table}`.slice(0, 240),
        columns,
        rows,
        hasMore: table.hasMore,
        totalColumns: table.columns.length,
      }
      if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 180_000)
        return c.json(
          {
            ok: false,
            error: {
              code: 'preview_too_large',
              message: 'Open this table in Database.',
            },
          },
          413,
        )
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.ui.describe') {
      uiDescribeParamsSchema.parse(params)
      return c.json({
        ok: true,
        result: {
          views: DB_UI_DESCRIPTIONS,
          entities:
            'Use schema.table from db-browser.schema.list for tables; SQL tab and dashboard ids come from their existing list scopes.',
        },
      })
    }

    if (method === 'db-browser.ui.navigate') {
      const navigation = uiNavigateParamsSchema.parse(params)
      if (navigation.view === 'connections') {
        const intent = await setUiIntent(dataDir, { view: 'connections' })
        return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
      }
      if (navigation.view === 'table') {
        if (!navigation.entityId) {
          const error = rpcError(
            'entity_id_required',
            'The table view requires schema.table as entityId.',
          )
          return c.json(error.body, error.status)
        }
        const table = await resolveTableTarget(
          workspaceId,
          dataDir,
          navigation.entityId,
          preferences,
        )
        const intent = await setUiIntent(dataDir, {
          view: 'table',
          entityId: `${table.schema}.${table.table}`,
          params: table,
        })
        return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
      }

      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        navigation.params ?? {},
      )
      if (navigation.view === 'query' && navigation.entityId) {
        const sqlWorkspace = await getSqlWorkspace(
          workspaceId,
          dataDir,
          connectionId,
        )
        if (!sqlWorkspace.tabs.some((tab) => tab.id === navigation.entityId)) {
          const error = rpcError('sql_tab_not_found', 'SQL tab not found', 404)
          return c.json(error.body, error.status)
        }
      }
      if (navigation.view === 'dashboard' && navigation.entityId) {
        const dashboardWorkspace = await getDashboardWorkspace(
          workspaceId,
          dataDir,
          connectionId,
        )
        if (
          !dashboardWorkspace.dashboards.some(
            (dashboard) => dashboard.id === navigation.entityId,
          )
        ) {
          const error = rpcError(
            'dashboard_not_found',
            'Dashboard not found',
            404,
          )
          return c.json(error.body, error.status)
        }
      }
      const intent = await setUiIntent(dataDir, {
        view: navigation.view,
        entityId: navigation.entityId,
        params: { ...navigation.params, connectionId },
      })
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (method === 'db-browser.ui.openTable') {
      const { table: tableInput } = uiOpenTableParamsSchema.parse(params)
      const table = await resolveTableTarget(
        workspaceId,
        dataDir,
        tableInput,
        preferences,
      )
      const intent = await setUiIntent(dataDir, {
        view: 'table',
        entityId: `${table.schema}.${table.table}`,
        params: table,
      })
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id, table },
      })
    }

    if (method === 'db-browser.ui.read') {
      const request = uiReadParamsSchema.parse(params)
      const state = await readJson<DbDriveState | null>(
        driveStatePath(dataDir),
        null,
      )
      const view = request.view ?? state?.view ?? 'connections'
      const entityId = request.entityId ?? state?.entityId
      if (view === 'connections') {
        return c.json({
          ok: true,
          result: {
            view,
            connections: await listConnections(workspaceId, dataDir),
            preferences,
          },
        })
      }
      if (view === 'table') {
        if (!entityId) {
          const error = rpcError(
            'entity_id_required',
            'Reading the table view requires schema.table.',
          )
          return c.json(error.body, error.status)
        }
        const table = await resolveTableTarget(
          workspaceId,
          dataDir,
          entityId,
          preferences,
        )
        return c.json({
          ok: true,
          result: {
            view,
            connectionId: table.connectionId,
            ...(await previewTable(
              workspaceId,
              dataDir,
              table.connectionId,
              table.schema,
              table.table,
              200,
              0,
              preferences.queryTimeoutMs,
            )),
          },
        })
      }
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        state?.params ?? {},
      )
      if (view === 'query') {
        const sqlWorkspace = await getSqlWorkspace(
          workspaceId,
          dataDir,
          connectionId,
        )
        return c.json({
          ok: true,
          result: {
            view,
            connectionId,
            sqlWorkspace,
            lastQueryResult: state?.lastQueryResult ?? null,
          },
        })
      }
      return c.json({
        ok: true,
        result: {
          view,
          connectionId,
          dashboardWorkspace: await getDashboardWorkspace(
            workspaceId,
            dataDir,
            connectionId,
          ),
        },
      })
    }

    if (method === 'db-browser.query.run') {
      const query = queryRunParamsSchema.parse(params)
      const connectionId = await resolveConnectionId(
        workspaceId,
        dataDir,
        query.connectionId,
      )
      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        query.sql,
        preferences.queryTimeoutMs,
      )
      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql: ensureSqlTerminator(query.sql),
        title: queryHistoryTitle(query.sql),
        rowCount: result.rowCount,
        executionMs: result.executionMs,
      }).catch(() => undefined)
      await writeJson(driveStatePath(dataDir), {
        view: 'query',
        params: { connectionId },
        lastQueryResult: { connectionId, sql: query.sql, result },
      } satisfies DbDriveState)
      return c.json({ ok: true, result: { connectionId, ...result } })
    }

    if (method === 'db-browser.connections.list') {
      const connections = await listConnections(workspaceId, dataDir)
      return c.json({
        ok: true,
        result: {
          connections,
          emptyStates:
            connections.length === 0
              ? [
                  {
                    title: 'No database connections',
                    description:
                      'Add a PostgreSQL connection in Database on Mac to browse it here.',
                  },
                ]
              : [],
          preferences,
        },
      })
    }

    if (method === 'db-browser.context.get') {
      const connections = await listConnections(workspaceId, dataDir)
      const connectionId = connections.length
        ? await resolveConnectionId(workspaceId, dataDir, params.connectionId)
        : null
      const includeSchema = params.includeSchema !== false
      const includeSqlWorkspace = params.includeSqlWorkspace !== false
      const includeDashboards = params.includeDashboards !== false

      return c.json({
        ok: true,
        result: {
          connections,
          activeConnectionId: connectionId,
          activeConnection:
            connections.find((connection) => connection.id === connectionId) ??
            null,
          schemas:
            connectionId && includeSchema
              ? await getExplorer(
                  workspaceId,
                  dataDir,
                  connectionId,
                  preferences.queryTimeoutMs,
                )
              : undefined,
          sqlWorkspace:
            connectionId && includeSqlWorkspace
              ? await getSqlWorkspace(workspaceId, dataDir, connectionId)
              : undefined,
          dashboardWorkspace:
            connectionId && includeDashboards
              ? await getDashboardWorkspace(workspaceId, dataDir, connectionId)
              : undefined,
          preferences,
        },
      })
    }

    if (method === 'db-browser.schema.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const schemas = await getExplorer(
        workspaceId,
        dataDir,
        connectionId,
        preferences.queryTimeoutMs,
      )
      const projectedSchemas = schemas.map((schema) => ({
        ...schema,
        tables: schema.tables.map((table) => ({
          ...table,
          schema: schema.name,
        })),
      }))
      if (params.nativeProjection === true) {
        const totalTables = projectedSchemas.reduce(
          (count, schema) => count + schema.tables.length,
          0,
        )
        const requestedMax =
          typeof params.maxTables === 'number' ? params.maxTables : 80
        let remaining = Math.min(Math.max(Math.floor(requestedMax), 1), 120)
        const visibleSchemas: typeof projectedSchemas = []
        for (const schema of projectedSchemas) {
          if (visibleSchemas.length >= 12 || remaining <= 0) break
          const tables = schema.tables.slice(0, remaining)
          if (tables.length === 0) continue
          visibleSchemas.push({ ...schema, tables })
          remaining -= tables.length
        }
        const visibleTables = visibleSchemas.reduce(
          (count, schema) => count + schema.tables.length,
          0,
        )
        return c.json({
          ok: true,
          result: {
            connectionId,
            summary: `${totalTables.toLocaleString()} ${totalTables === 1 ? 'table' : 'tables'} across ${projectedSchemas.length.toLocaleString()} ${projectedSchemas.length === 1 ? 'schema' : 'schemas'}`,
            schemas: visibleSchemas,
            emptyStates:
              totalTables === 0
                ? [
                    {
                      title: 'No tables found',
                      description:
                        'This connection is available, but it does not expose any tables.',
                    },
                  ]
                : [],
            truncationNote:
              visibleTables < totalTables
                ? `Showing ${visibleTables} of ${totalTables.toLocaleString()} tables. Ask Moldable to inspect a specific schema or table.`
                : '',
          },
        })
      }
      return c.json({
        ok: true,
        result: { connectionId, schemas: projectedSchemas },
      })
    }

    if (method === 'db-browser.schema.search') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await searchSchema(
          workspaceId,
          dataDir,
          connectionId,
          params.query,
          params.limit,
          preferences.queryTimeoutMs,
        ),
      })
    }

    if (method === 'db-browser.schema.describe') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const described = await describeTable(
        workspaceId,
        dataDir,
        connectionId,
        typeof params.schema === 'string' ? params.schema : '',
        typeof params.table === 'string' ? params.table : '',
        preferences.queryTimeoutMs,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          ...described,
          columns: described.columns.map((column) => ({
            ...column,
            nullableLabel: column.nullable ? 'Nullable' : 'Required',
          })),
          columnEmptyStates:
            described.columns.length === 0
              ? [
                  {
                    title: 'No columns found',
                    description:
                      'This table is available, but it did not return any column definitions.',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'db-browser.native.tablePreview') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const schema =
        typeof params.schema === 'string' ? params.schema.trim() : ''
      const table = typeof params.table === 'string' ? params.table.trim() : ''
      if (!schema || !table) throw new Error('Schema and table are required')
      const preview = await previewTable(
        workspaceId,
        dataDir,
        connectionId,
        schema,
        table,
        25,
        0,
        preferences.queryTimeoutMs,
      )
      const columns = preview.columns.slice(0, 12).map((column) => column.name)
      return c.json({
        ok: true,
        result: {
          connectionId,
          schema,
          table,
          columns,
          rows: preview.rows
            .slice(0, 25)
            .map((row) => columns.map((column) => nativeCellText(row[column]))),
          tableSections: preview.rows.length > 0 ? [{}] : [],
          caption: `${preview.rowCount.toLocaleString()} ${preview.rowCount === 1 ? 'row' : 'rows'} shown · ${columns.length} ${columns.length === 1 ? 'column' : 'columns'}`,
          truncationNote:
            preview.columns.length > columns.length || preview.hasMore
              ? 'Preview is bounded to 25 rows and 12 columns. Use Database on Mac or an explicit read-only query for more.'
              : '',
          emptyStates:
            preview.rows.length === 0
              ? [
                  {
                    title: 'No rows',
                    description:
                      'This table returned no records in the bounded preview.',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'db-browser.native.queries') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await getSqlWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          countLabel: `${workspace.tabs.length.toLocaleString()} saved ${workspace.tabs.length === 1 ? 'query' : 'queries'}`,
          tabs: workspace.tabs.map((tab) => ({
            id: tab.id,
            title: tab.title || 'Untitled query',
            sqlPreview:
              tab.sql.trim().replaceAll(/\s+/g, ' ').slice(0, 180) ||
              'Empty SQL tab',
            metadata: `Updated ${nativeDateLabel(tab.updatedAt)}`,
            stateLabel: tab.id === workspace.activeTabId ? 'Active' : '',
            displayLabel: `Open ${tab.title || 'Untitled query'}`,
          })),
          emptyStates:
            workspace.tabs.length === 0
              ? [
                  {
                    title: 'No saved queries',
                    description:
                      'Create a SQL tab in Database on Mac to see it here.',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'db-browser.native.queryDetail') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const queryId = typeof params.queryId === 'string' ? params.queryId : ''
      const workspace = await getSqlWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      const tab = workspace.tabs.find((candidate) => candidate.id === queryId)
      if (!tab) throw new Error('Saved query not found')
      const sql = tab.sql.slice(0, 50_000)
      return c.json({
        ok: true,
        result: {
          connectionId,
          id: tab.id,
          title: tab.title || 'Untitled query',
          sql,
          metadataRows: [
            {
              label: 'State',
              value:
                tab.id === workspace.activeTabId ? 'Active tab' : 'Saved tab',
            },
            { label: 'Created', value: nativeDateLabel(tab.createdAt) },
            { label: 'Updated', value: nativeDateLabel(tab.updatedAt) },
            {
              label: 'Length',
              value: `${tab.sql.length.toLocaleString()} characters`,
            },
          ],
          truncationNotices:
            sql.length < tab.sql.length
              ? [
                  {
                    message: 'SQL is capped at 50,000 characters on iPhone.',
                    tone: 'warning',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'db-browser.native.dashboards') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await getDashboardWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          countLabel: `${workspace.dashboards.length.toLocaleString()} ${workspace.dashboards.length === 1 ? 'dashboard' : 'dashboards'}`,
          dashboards: workspace.dashboards.map((dashboard) => ({
            id: dashboard.id,
            title: dashboard.title,
            subtitle: `${dashboard.charts.length.toLocaleString()} ${dashboard.charts.length === 1 ? 'chart' : 'charts'}`,
            metadata:
              dashboard.description?.trim() ||
              `Updated ${nativeDateLabel(dashboard.updatedAt)}`,
            stateLabel:
              dashboard.id === workspace.activeDashboardId ? 'Active' : '',
            displayLabel: `Open ${dashboard.title}`,
          })),
          emptyStates:
            workspace.dashboards.length === 0
              ? [
                  {
                    title: 'No dashboards',
                    description:
                      'Create a dashboard in Database on Mac to see it here.',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'db-browser.native.dashboardDetail') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId =
        typeof params.dashboardId === 'string' ? params.dashboardId : ''
      const workspace = await getDashboardWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      const dashboard = workspace.dashboards.find(
        (candidate) => candidate.id === dashboardId,
      )
      if (!dashboard) throw new Error('Dashboard not found')
      const projection = await projectNativeDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboard,
        preferences.queryTimeoutMs,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          id: dashboard.id,
          title: dashboard.title,
          description: dashboard.description?.trim() || 'Saved dashboard',
          stateLabel:
            dashboard.id === workspace.activeDashboardId ? 'Active' : 'Saved',
          updatedLabel: nativeDateLabel(dashboard.updatedAt),
          ...projection,
        },
      })
    }

    if (method === 'db-browser.query.runReadonly') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const sql = typeof params.sql === 'string' ? params.sql : ''
      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        sql,
        preferences.queryTimeoutMs,
      )

      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql: ensureSqlTerminator(sql),
        title: queryHistoryTitle(sql),
        rowCount: result.rowCount,
        executionMs: result.executionMs,
      }).catch(() => undefined)

      return c.json({
        ok: true,
        result: {
          connectionId,
          ...result,
        },
      })
    }

    if (method === 'db-browser.query.explain') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const rawSql = typeof params.sql === 'string' ? params.sql.trim() : ''
      const sql = /^explain\b/i.test(rawSql) ? rawSql : `explain ${rawSql}`

      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        sql,
        preferences.queryTimeoutMs,
      )

      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql: ensureSqlTerminator(sql),
        title: queryHistoryTitle(sql),
        rowCount: result.rowCount,
        executionMs: result.executionMs,
      }).catch(() => undefined)

      return c.json({
        ok: true,
        result: {
          connectionId,
          ...result,
        },
      })
    }

    if (method === 'db-browser.sqlTabs.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await getSqlWorkspace(workspaceId, dataDir, connectionId),
      })
    }

    if (method === 'db-browser.sqlTabs.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await createSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.sqlTabs.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await updateSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params.tabId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.sqlTabs.edit') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await editSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.sqlTabs.select') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await selectSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params.tabId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result: workspace })
    }

    if (method === 'db-browser.dashboards.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await getDashboardWorkspace(workspaceId, dataDir, connectionId),
      })
    }

    if (method === 'db-browser.dashboards.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await createDashboard(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboards.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await updateDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboards.delete') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await removeDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboards.select') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await selectDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboardCharts.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await getDashboardWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      const dashboardId = resolveNamedDashboard(workspace, params)
      const dashboard = workspace.dashboards.find(
        (item) => item.id === dashboardId,
      )
      if (!dashboard) throw new Error('Dashboard not found')
      return c.json({
        ok: true,
        result: {
          connectionId,
          dashboard,
          charts: dashboard.charts,
        },
      })
    }

    if (method === 'db-browser.dashboardCharts.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await createDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboardCharts.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId } = await resolveRpcDashboardAndChartId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await updateDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboardCharts.edit') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId, dashboard } =
        await resolveRpcDashboardAndChartId(
          workspaceId,
          dataDir,
          connectionId,
          params,
        )
      const chart = dashboard.charts.find((item) => item.id === chartId)
      if (!chart) throw new Error('Chart not found')
      const result = await updateDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
        editDashboardChartSql(chart, params),
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db-browser.dashboardCharts.delete') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId } = await resolveRpcDashboardAndChartId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await removeDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    const error = rpcError('method_not_found', `Unknown method: ${method}`, 404)
    return c.json(error.body, error.status)
  } catch (error) {
    if (isZodError(error)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Database received invalid drive parameters.',
            issues: error.issues,
          },
        },
        400,
      )
    }
    if (error instanceof Error && error.name === 'AmbiguousTable') {
      const response = rpcError('ambiguous_table', error.message, 409)
      return c.json(response.body, response.status)
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'db_browser_rpc_failed',
          message:
            error instanceof Error ? error.message : 'Database RPC failed',
        },
      },
      400,
    )
  }
})

app.get('/api/connections', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(await listConnections(workspaceId, getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to load saved connections',
    )
  }
})

app.get('/api/preferences', async (c) => {
  try {
    return c.json(await getPreferences(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load preferences',
    )
  }
})

app.patch('/api/preferences', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    return c.json(await savePreferences(getDataDir(c), body))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save preferences',
      400,
    )
  }
})

app.post('/api/connections/test', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(await testConnection(workspaceId, input))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to test connection',
      400,
    )
  }
})

app.post('/api/connections/:id/test', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(
      await testSavedConnection(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        input,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to test connection',
      400,
    )
  }
})

app.post('/api/connections', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(await saveConnection(workspaceId, getDataDir(c), input), 201)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save connection',
      400,
    )
  }
})

app.patch('/api/connections/:id', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(
      await updateConnection(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        input,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update connection',
      400,
    )
  }
})

app.delete('/api/connections/:id', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    await removeConnection(workspaceId, getDataDir(c), c.req.param('id'))
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete connection',
      404,
    )
  }
})

app.get('/api/connections/:id/explorer', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    return c.json(
      await getExplorer(
        workspaceId,
        dataDir,
        c.req.param('id'),
        preferences.queryTimeoutMs,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load schema explorer',
      400,
    )
  }
})

app.get('/api/connections/:id/sql-workspace', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await getSqlWorkspace(workspaceId, getDataDir(c), c.req.param('id')),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load SQL workspace',
      400,
    )
  }
})

app.put('/api/connections/:id/sql-workspace', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await saveSqlWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save SQL workspace',
      400,
    )
  }
})

app.get('/api/connections/:id/dashboards', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await getDashboardWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load dashboards',
      400,
    )
  }
})

app.put('/api/connections/:id/dashboards', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await saveDashboardWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save dashboards',
      400,
    )
  }
})

app.post('/api/connections/:id/dashboard-chart-query', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: unknown
      maxRows?: unknown
    }
    const sql = typeof body.sql === 'string' ? body.sql : ''

    const result = await runReadOnlyQuery(
      workspaceId,
      dataDir,
      c.req.param('id'),
      sql,
      preferences.queryTimeoutMs,
    )
    const maxRows =
      typeof body.maxRows === 'number' && Number.isFinite(body.maxRows)
        ? Math.max(1, Math.min(5_000, Math.round(body.maxRows)))
        : 500

    return c.json({
      ...result,
      rows: result.rows.slice(0, maxRows),
      rowCount: result.rowCount ?? result.rows.length,
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load dashboard chart',
      400,
    )
  }
})

app.get('/api/connections/:id/query-history', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await listQueryHistory(workspaceId, getDataDir(c), c.req.param('id')),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load query history',
      400,
    )
  }
})

app.post('/api/connections/:id/query-history', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await appendQueryHistory(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
      201,
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save query history',
      400,
    )
  }
})

app.get('/api/connections/:id/preview', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const schema = c.req.query('schema') ?? ''
    const table = c.req.query('table') ?? ''
    const limit = Number(c.req.query('limit') ?? '100')
    const offset = Number(c.req.query('offset') ?? '0')

    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      return jsonError(c, 'Limit must be between 1 and 200', 400)
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      return jsonError(c, 'Offset must be a non-negative safe integer', 400)
    }

    const result = await previewTable(
      workspaceId,
      dataDir,
      c.req.param('id'),
      schema,
      table,
      limit,
      offset,
      preferences.queryTimeoutMs,
    )
    await appendQueryHistory(workspaceId, dataDir, c.req.param('id'), {
      sql: previewSql(schema, table, limit, offset),
      title: `${schema}.${table}`,
      rowCount: result.rowCount,
      executionMs: null,
    }).catch(() => undefined)

    return c.json(result)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to preview table',
      400,
    )
  }
})

app.post('/api/connections/:id/query', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: unknown
    }
    const sql = typeof body.sql === 'string' ? body.sql : ''

    const result = await runSqlStatement(
      workspaceId,
      dataDir,
      c.req.param('id'),
      sql,
      {
        timeoutMs: preferences.queryTimeoutMs,
      },
    )
    await appendQueryHistory(workspaceId, dataDir, c.req.param('id'), {
      sql: ensureSqlTerminator(sql),
      title: queryHistoryTitle(sql),
      rowCount: result.rowCount,
      executionMs: result.executionMs,
    }).catch(() => undefined)

    return c.json(result)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to execute query',
      400,
    )
  }
})

app.post('/api/connections/:id/export', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = await c.req.json().catch(() => ({}))
    const params = paramsObject(body)
    const sql = typeof params.sql === 'string' ? params.sql : ''

    return c.json(
      await exportReadOnlyQuery(workspaceId, dataDir, c.req.param('id'), sql, {
        format: params.format,
        filename: params.filename,
        timeoutMs: preferences.queryTimeoutMs,
      }),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to export query',
      400,
    )
  }
})

app.post('/api/connections/:id/import', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = await c.req.json().catch(() => ({}))

    return c.json(
      await importRows(
        workspaceId,
        dataDir,
        c.req.param('id'),
        body,
        preferences.queryTimeoutMs,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import rows',
      400,
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
