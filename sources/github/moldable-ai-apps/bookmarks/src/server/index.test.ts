import { readJson } from '@moldable-ai/storage'
import { installTodayDismissalRoutes } from './moldable'
import { resolveStaticFilePath } from './static'
import { Hono } from 'hono'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })
})

describe('installTodayDismissalRoutes', () => {
  const originalDataDir = process.env.MOLDABLE_APP_DATA_DIR
  const originalAppId = process.env.MOLDABLE_APP_ID
  const tempDirs: string[] = []

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.MOLDABLE_APP_DATA_DIR
    } else {
      process.env.MOLDABLE_APP_DATA_DIR = originalDataDir
    }
    if (originalAppId === undefined) {
      delete process.env.MOLDABLE_APP_ID
    } else {
      process.env.MOLDABLE_APP_ID = originalAppId
    }

    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    )
  })

  it('persists host dismissals and filters matching Today items', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'moldable-template-'))
    tempDirs.push(dataDir)
    process.env.MOLDABLE_APP_DATA_DIR = dataDir
    process.env.MOLDABLE_APP_ID = 'template-test'

    const app = new Hono()
    installTodayDismissalRoutes(app)
    app.get('/api/moldable/today', (c) =>
      c.json({
        items: [
          {
            id: 'item-1',
            kind: 'timely',
            title: 'Pay invoice',
            subtitle: 'Due today',
            groupHint: 'billing',
          },
          {
            id: 'item-2',
            kind: 'threshold',
            title: 'Review queue',
          },
        ],
        resume: null,
        generatedAt: '2026-06-26T00:00:00.000Z',
      }),
    )

    const dismissResponse = await app.request('/api/moldable/today/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'item-1',
        dismissalKey: 'template-test:item-1',
        materialDismissalKey: [
          'material',
          'template-test',
          'timely',
          'text',
          'pay invoice',
          'due today',
          'billing',
          '',
        ].join('\u001e'),
        dismissedAt: '2026-06-26T12:00:00.000Z',
        item: {
          kind: 'timely',
          title: 'Pay invoice',
          subtitle: 'Due today',
          groupHint: 'billing',
        },
      }),
    })

    expect(dismissResponse.status).toBe(200)
    await expect(
      readJson(path.join(dataDir, 'today-dismissals.json'), []),
    ).resolves.toHaveLength(1)

    const todayResponse = await app.request('/api/moldable/today')
    const today = (await todayResponse.json()) as {
      items: Array<{ id: string }>
      resume: unknown
    }

    expect(today.items.map((item) => item.id)).toEqual(['item-2'])
    expect(today.resume).toBeNull()
  })
})
