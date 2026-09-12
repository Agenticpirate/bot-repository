import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>()
  return {
    ...actual,
    getPreferences: vi.fn(async () => ({
      activeConnectionId: 'conn-1',
      sqlEditorHeight: 128,
      queryTimeoutMs: 5000,
    })),
    listConnections: vi.fn(async () => [
      {
        id: 'conn-1',
        engine: 'postgres',
        name: 'Proof DB',
        host: 'localhost',
        port: 5432,
        database: 'proof',
        user: 'proof',
        ssl: false,
        color: null,
        environment: null,
        policyMode: 'read-only',
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      },
    ]),
    resolveConnectionId: vi.fn(async () => 'conn-1'),
    getExplorer: vi.fn(async () => [
      {
        name: 'public',
        tables: [{ name: 'people', type: 'BASE TABLE' }],
      },
    ]),
    describeTable: vi.fn(async () => ({
      schema: 'public',
      table: 'people',
      columns: [{ name: 'id', dataType: 'integer', nullable: false }],
    })),
    previewTable: vi.fn(async () => ({
      schema: 'public',
      table: 'people',
      columns: [{ name: 'id', dataType: 'integer', nullable: false }],
      rows: [{ id: 1 }],
      rowCount: 1,
      limit: 200,
      offset: 0,
      hasMore: false,
    })),
    runReadOnlyQuery: vi.fn(async () => ({
      columns: ['id'],
      rows: [{ id: 1 }],
      rowCount: 1,
      executionMs: 2,
      command: 'SELECT',
      readOnly: true,
    })),
    appendQueryHistory: vi.fn(async () => undefined),
    getSqlWorkspace: vi.fn(async () => ({
      connectionId: 'conn-1',
      activeTabId: 'tab-1',
      tabs: [
        {
          id: 'tab-1',
          title: 'People',
          sql: 'select id from public.people',
          createdAt: '2026-07-27T00:00:00.000Z',
          updatedAt: '2026-07-27T00:00:00.000Z',
        },
      ],
      updatedAt: '2026-07-27T00:00:00.000Z',
    })),
    getDashboardWorkspace: vi.fn(async () => ({
      connectionId: 'conn-1',
      activeDashboardId: 'dashboard-1',
      dashboards: [
        {
          id: 'dashboard-1',
          title: 'Overview',
          charts: [
            {
              id: 'chart-1',
              title: 'People',
              description: 'People over time',
              type: 'line',
              sql: 'select 1 as id',
              xAxis: 'id',
              series: [{ id: 'series-1', name: 'People', column: 'id' }],
              categoryColumn: '',
              metricColumn: '',
              tableColumns: [],
            },
          ],
          createdAt: '2026-07-27T00:00:00.000Z',
          updatedAt: '2026-07-27T00:00:00.000Z',
        },
      ],
      updatedAt: '2026-07-27T00:00:00.000Z',
    })),
  }
})

const originalEnv = { ...process.env }
const workspaceId = 'drive-test'
let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'db-browser-drive-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'db-browser',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-workspace': workspaceId,
    },
    body: JSON.stringify({ method, params }),
  })
}

describe('Database drive contract', () => {
  it('describes views and Zod-rejects an unknown view', async () => {
    const described = await rpc('db-browser.ui.describe')
    expect(described.status).toBe(200)
    expect(
      (
        (await described.json()) as {
          result: { views: Array<{ id: string }> }
        }
      ).result.views.map((view) => view.id),
    ).toEqual(['connections', 'table', 'query', 'dashboard'])

    const rejected = await rpc('db-browser.ui.navigate', { view: 'raw-sql' })
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: { code: 'invalid_params' },
    })
  })

  it('projects saved query and dashboard details without exposing an execution action', async () => {
    const queryResponse = await rpc('db-browser.native.queryDetail', {
      connectionId: 'conn-1',
      queryId: 'tab-1',
    })
    expect(queryResponse.status).toBe(200)
    expect(await queryResponse.json()).toMatchObject({
      result: {
        title: 'People',
        sql: 'select id from public.people',
        truncationNotices: [],
      },
    })

    const dashboardResponse = await rpc('db-browser.native.dashboardDetail', {
      connectionId: 'conn-1',
      dashboardId: 'dashboard-1',
    })
    expect(dashboardResponse.status).toBe(200)
    expect(await dashboardResponse.json()).toMatchObject({
      result: {
        title: 'Overview',
        lineCharts: [{ title: 'People', values: [1], labels: ['1'] }],
        unsupportedCharts: [],
      },
    })
  })

  it('opens a real schema table through the last-wins intent and acks it', async () => {
    const opened = await rpc('db-browser.ui.openTable', {
      table: 'public.people',
    })
    const openedBody = (await opened.json()) as {
      result: { intentId: string }
    }
    expect(opened.status).toBe(200)

    const pending = await app.request('/api/moldable/ui-intent', {
      headers: { 'x-moldable-workspace': workspaceId },
    })
    expect(await pending.json()).toMatchObject({
      id: openedBody.result.intentId,
      view: 'table',
      entityId: 'public.people',
    })

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${openedBody.result.intentId}`,
      {
        method: 'DELETE',
        headers: { 'x-moldable-workspace': workspaceId },
      },
    )
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
  })

  it('reads at most 200 table rows and reuses the existing read-only query path', async () => {
    const read = await rpc('db-browser.ui.read', {
      view: 'table',
      entityId: 'public.people',
    })
    expect(await read.json()).toMatchObject({
      result: {
        schema: 'public',
        table: 'people',
        limit: 200,
        rows: [{ id: 1 }],
      },
    })

    const run = await rpc('db-browser.query.run', {
      sql: 'select id from public.people',
    })
    expect(await run.json()).toMatchObject({
      result: {
        connectionId: 'conn-1',
        rows: [{ id: 1 }],
        readOnly: true,
      },
    })
  })

  it('projects schema context and display-ready nullability for NativeUI', async () => {
    const schemas = await rpc('db-browser.schema.list', {
      connectionId: 'conn-1',
    })
    expect(await schemas.json()).toMatchObject({
      result: {
        schemas: [
          {
            name: 'public',
            tables: [{ name: 'people', schema: 'public' }],
          },
        ],
      },
    })

    const described = await rpc('db-browser.schema.describe', {
      connectionId: 'conn-1',
      schema: 'public',
      table: 'people',
    })
    expect(await described.json()).toMatchObject({
      result: {
        columns: [{ name: 'id', nullableLabel: 'Required' }],
        columnEmptyStates: [],
      },
    })

    const preview = await rpc('db-browser.native.tablePreview', {
      connectionId: 'conn-1',
      schema: 'public',
      table: 'people',
    })
    expect(await preview.json()).toMatchObject({
      result: {
        columns: ['id'],
        rows: [['1']],
        caption: '1 row shown · 1 column',
      },
    })

    const queries = await rpc('db-browser.native.queries', {
      connectionId: 'conn-1',
    })
    expect(await queries.json()).toMatchObject({
      result: {
        countLabel: '1 saved query',
        tabs: [{ title: 'People', stateLabel: 'Active' }],
      },
    })

    const dashboards = await rpc('db-browser.native.dashboards', {
      connectionId: 'conn-1',
    })
    expect(await dashboards.json()).toMatchObject({
      result: {
        countLabel: '1 dashboard',
        dashboards: [{ title: 'Overview', subtitle: '1 chart' }],
      },
    })
  })
})
