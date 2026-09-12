import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let tempHome = ''
let app: typeof import('./app').app

const workspaceHeaders = {
  'content-type': 'application/json',
  'x-moldable-workspace': 'drive-test',
}

async function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: workspaceHeaders,
    body: JSON.stringify({ method, params }),
  })
}

describe('Money drive contract', () => {
  beforeAll(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'money-drive-test-'))
    process.env.HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'money'
    ;({ app } = await import('./app'))
  })

  afterAll(async () => {
    await fs.rm(tempHome, { recursive: true, force: true })
  })

  it('describes model-readable views and rejects invalid navigation', async () => {
    const describeResponse = await rpc('money.ui.describe')
    expect(describeResponse.status).toBe(200)
    const describe = await describeResponse.json()
    expect(
      describe.result.views.map((view: { id: string }) => view.id),
    ).toEqual(['dashboards', 'accounts', 'budget'])

    const invalidResponse = await rpc('money.ui.navigate', {
      view: 'transactions',
    })
    expect(invalidResponse.status).toBe(400)
    expect((await invalidResponse.json()).error.code).toBe('invalid_rpc_params')
  })

  it('queues, reads, and acknowledges a single UI intent', async () => {
    const navigateResponse = await rpc('money.ui.navigate', {
      view: 'budget',
      params: { month: '2026-07' },
    })
    const navigate = await navigateResponse.json()
    expect(navigate.result.ok).toBe(true)

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: workspaceHeaders,
    })
    const intent = await getResponse.json()
    expect(intent).toMatchObject({
      id: navigate.result.intentId,
      view: 'budget',
      params: { month: '2026-07' },
    })

    const deleteResponse = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: workspaceHeaders },
    )
    expect(deleteResponse.status).toBe(200)
    expect(
      await (
        await app.request('/api/moldable/ui-intent', {
          headers: workspaceHeaders,
        })
      ).json(),
    ).toBeNull()
  })

  it('reads balances and budget data and supports both signature actions', async () => {
    const accountResponse = await app.request('/api/accounts', {
      method: 'POST',
      headers: workspaceHeaders,
      body: JSON.stringify({
        id: 'drive-checking',
        name: 'Drive Checking',
        type: 'cash',
        currentBalance: 2400,
        isoCurrencyCode: 'CAD',
      }),
    })
    expect(accountResponse.status).toBe(200)

    const readResponse = await rpc('money.ui.read', {
      view: 'budget',
      month: '2026-07',
    })
    const read = await readResponse.json()
    expect(read.result.balances.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'manual-account-drive-checking',
          currentBalance: 2400,
          displayBalance: '$2,400',
        }),
      ]),
    )
    expect(read.result.overviewMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Net worth', value: 'US$2,400' }),
      ]),
    )
    expect(read.result.overviewHero).toEqual([
      expect.objectContaining({ label: 'Net worth', value: 'US$2,400' }),
    ])
    expect(read.result.netWorthTrends).toEqual([
      expect.objectContaining({
        values: expect.any(Array),
        labels: expect.any(Array),
      }),
    ])
    expect(
      read.result.destinationRows.map((row: { title: string }) => row.title),
    ).toEqual(['Activity', 'Accounts', 'Budget', 'Connections'])
    expect(read.result.budget).toMatchObject({
      month: '2026-07',
      categories: [],
      displayCashFlow: 'US$0',
    })
    expect(read.result.budgetEmptyStates).toHaveLength(1)

    expect((await (await rpc('money.ui.showAccounts')).json()).result.ok).toBe(
      true,
    )
    expect(
      (await (await rpc('money.ui.showBudget', { month: '2026-07' })).json())
        .result.ok,
    ).toBe(true)
  })

  it('projects an honest empty institution-management state', async () => {
    const response = await rpc('money.connections.list')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result.connections).toEqual([])
    expect(body.result.emptyStates).toEqual([
      expect.objectContaining({ title: 'No connected institutions' }),
    ])
  })

  it('projects an honest empty native activity state', async () => {
    const response = await rpc('money.transactions.search', { limit: 50 })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result.transactions).toEqual([])
    expect(body.result.resultLabel).toBe('Recent activity')
    expect(body.result.emptyStates).toEqual([
      expect.objectContaining({ title: 'No transactions yet' }),
    ])
  })

  it('rejects a native category correction for a missing transaction', async () => {
    const response = await rpc('money.transactions.categorize', {
      transactionId: 'missing-transaction',
      categoryChoice: ['choice-0'],
    })
    expect(response.status).toBe(404)
    expect((await response.json()).error.code).toBe('transaction_not_found')
  })

  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(new URL('../../moldable.json', import.meta.url), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(new URL('../../native-ui.json', import.meta.url)),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
