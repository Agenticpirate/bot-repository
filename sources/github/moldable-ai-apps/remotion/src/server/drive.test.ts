import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('remotion drive contract', async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'remotion-drive-'))
  const previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
  t.after(async () => {
    if (previousDataDir === undefined) delete process.env.MOLDABLE_APP_DATA_DIR
    else process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
    await rm(dataDir, { recursive: true, force: true })
  })

  const { app } = await import('./app')
  const headers = {
    'x-moldable-workspace': 'remotion-drive-test',
    'Content-Type': 'application/json',
  }
  const rpc = (method: string, params?: unknown) =>
    app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, params }),
    })

  const create = await rpc('remotion.projects.create', {
    name: 'Sales launch',
    description: 'A concise launch composition',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 300,
    compositionCode:
      'export const SalesComposition = () => <AbsoluteFill>Launch</AbsoluteFill>;',
  })
  const created = (await create.json()) as { result: { id: string } }
  const projectId = created.result.id

  await writeFile(
    path.join(dataDir, 'render-jobs.json'),
    JSON.stringify([
      {
        id: 'render-failed',
        projectId,
        projectName: 'Sales launch',
        status: 'failed',
        startedAt: '2026-08-03T12:00:00.000Z',
        completedAt: '2026-08-03T12:01:00.000Z',
        error: 'Composition failed to bundle',
      },
      {
        id: 'render-completed',
        projectId,
        projectName: 'Sales launch',
        status: 'completed',
        startedAt: '2026-08-02T12:00:00.000Z',
        completedAt: '2026-08-02T12:02:00.000Z',
        outputFileName: 'sales-launch.mp4',
      },
    ]),
  )

  await t.test(
    'projects bounded native library and composition metadata',
    async () => {
      const libraryResponse = await rpc('remotion.native.read', {
        route: 'library',
        limit: 24,
      })
      const library = (await libraryResponse.json()) as {
        result: {
          projects: Array<{ id: string }>
          recentRenders: Array<{ tone: string; subtitle: string }>
        }
      }
      assert.ok(
        library.result.projects.some((project) => project.id === projectId),
      )
      assert.equal(library.result.recentRenders[0]?.tone, 'error')
      assert.match(library.result.recentRenders[0]?.subtitle ?? '', /bundle/)

      const projectResponse = await rpc('remotion.native.read', {
        route: 'project',
        id: projectId,
      })
      const projected = (await projectResponse.json()) as {
        result: {
          id: string
          statusLabel: string
          metrics: unknown[]
          components: Array<{ name: string; detail: string }>
          draft: {
            name: string
            width: number
            height: number
            fps: number
            durationInFrames: number
            deleteConfirmationName: string
          }
          renderStatusBadges: Array<{ tone: string }>
        }
      }
      assert.equal(projected.result.id, projectId)
      assert.equal(projected.result.statusLabel, 'Composition ready')
      assert.equal(projected.result.metrics.length, 4)
      assert.deepEqual(projected.result.components, [
        { name: 'SalesComposition', detail: 'Exported component' },
      ])
      assert.deepEqual(projected.result.draft, {
        name: 'Sales launch',
        description: 'A concise launch composition',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 300,
        deleteConfirmationName: '',
      })
      assert.equal(projected.result.renderStatusBadges[0]?.tone, 'error')
    },
  )

  await t.test('validates and persists native render settings', async () => {
    const invalid = await rpc('remotion.projects.update', {
      id: projectId,
      width: 8,
    })
    assert.equal(invalid.status, 400)

    const updated = await rpc('remotion.projects.update', {
      id: projectId,
      name: 'Sales launch revised',
      description: 'Updated from the focused native draft',
      width: 1280,
      height: 720,
      fps: 24,
      durationInFrames: 240,
    })
    assert.equal(updated.status, 200)

    const projected = await rpc('remotion.native.read', {
      route: 'project',
      id: projectId,
    })
    const body = (await projected.json()) as {
      result: {
        draft: {
          name: string
          description: string
          width: number
          height: number
          fps: number
          durationInFrames: number
          deleteConfirmationName: string
        }
      }
    }
    assert.deepEqual(body.result.draft, {
      name: 'Sales launch revised',
      description: 'Updated from the focused native draft',
      width: 1280,
      height: 720,
      fps: 24,
      durationInFrames: 240,
      deleteConfirmationName: '',
    })
  })

  await t.test('describes both model-readable views', async () => {
    const response = await rpc('remotion.ui.describe', {})
    const body = (await response.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    assert.equal(response.status, 200)
    assert.deepEqual(
      body.result.views.map((view) => view.id),
      ['projects', 'project'],
    )
    assert.ok(body.result.views.every((view) => view.description.length > 30))
  })

  await t.test(
    'queues and acknowledges a last-wins navigation intent',
    async () => {
      await rpc('remotion.ui.navigate', { view: 'projects' })
      const navigate = await rpc('remotion.ui.navigate', {
        view: 'project',
        entityId: projectId,
      })
      const navigateBody = (await navigate.json()) as {
        result: { intentId: string }
      }
      const getResponse = await app.request('/api/moldable/ui-intent', {
        headers,
      })
      const intent = (await getResponse.json()) as {
        id: string
        view: string
        entityId?: string
      }
      assert.equal(intent.id, navigateBody.result.intentId)
      assert.equal(intent.view, 'project')
      assert.equal(intent.entityId, projectId)

      const ack = await app.request(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
        { method: 'DELETE', headers },
      )
      assert.equal(((await ack.json()) as { deleted: boolean }).deleted, true)
    },
  )

  await t.test('opens a real project through its signature scope', async () => {
    const response = await rpc('remotion.ui.openProject', { projectId })
    const body = (await response.json()) as {
      result: { projectId: string; intentId: string }
    }
    assert.equal(response.status, 200)
    assert.equal(body.result.projectId, projectId)
    assert.ok(body.result.intentId)
  })

  await t.test('reads project and composition summary faithfully', async () => {
    const response = await rpc('remotion.ui.read', {
      view: 'project',
      entityId: projectId,
    })
    const body = (await response.json()) as {
      result: {
        project: { name: string; durationSeconds: number }
        composition: {
          exportedComponents: string[]
          sourceLength: number
          code: string
        }
      }
    }
    assert.equal(response.status, 200)
    assert.equal(body.result.project.name, 'Sales launch revised')
    assert.equal(body.result.project.durationSeconds, 10)
    assert.deepEqual(body.result.composition.exportedComponents, [
      'SalesComposition',
    ])
    assert.ok(body.result.composition.sourceLength > 70)
    assert.match(body.result.composition.code, /Launch/)
  })

  await t.test('Zod-rejects an unknown view', async () => {
    const response = await rpc('remotion.ui.navigate', { view: 'render-queue' })
    assert.equal(response.status, 400)
    assert.equal(
      ((await response.json()) as { error: { code: string } }).error.code,
      'invalid_params',
    )
  })

  await t.test(
    'requires the typed project name before destructive deletion',
    async () => {
      const mismatch = await rpc('remotion.projects.delete', {
        id: projectId,
        confirmationName: 'Wrong project',
      })
      assert.equal(mismatch.status, 409)
      assert.equal(
        ((await mismatch.json()) as { error: { code: string } }).error.code,
        'confirmation_mismatch',
      )

      const stillPresent = await rpc('remotion.native.read', {
        route: 'project',
        id: projectId,
      })
      assert.equal(stillPresent.status, 200)

      const deleted = await rpc('remotion.projects.delete', {
        id: projectId,
        confirmationName: 'Sales launch revised',
      })
      assert.equal(deleted.status, 200)
      assert.deepEqual(await deleted.json(), {
        ok: true,
        result: { deleted: true, id: projectId },
      })

      const missing = await rpc('remotion.native.read', {
        route: 'project',
        id: projectId,
      })
      assert.equal(missing.status, 404)
    },
  )
})
