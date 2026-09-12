import { app } from './app'
import { createArtifact } from './operations'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let tempHome = ''
const workspaceId = 'drive-test'

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'artifacts-drive-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'artifacts',
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
      'Content-Type': 'application/json',
      'x-moldable-workspace': workspaceId,
    },
    body: JSON.stringify({ method, params }),
  })
}

describe('Artifacts drive contract', () => {
  it('describes views and zod-rejects invalid navigation', async () => {
    const described = await rpc('artifacts.ui.describe')
    expect(described.status).toBe(200)
    expect(
      (
        (await described.json()) as {
          result: { views: Array<{ id: string }> }
        }
      ).result.views.map((view) => view.id),
    ).toEqual(['library', 'artifact', 'presentation'])

    const rejected = await rpc('artifacts.ui.navigate', { view: 'settings' })
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: { code: 'validation_error' },
    })
  })

  it('validates entities and keeps a last-wins intent until acked', async () => {
    const artifact = await createArtifact(workspaceId, {
      kind: 'page',
      title: 'Drive page',
      page: { html: '<main><h1>Hello</h1><p>Visible copy.</p></main>' },
    })

    const first = await rpc('artifacts.ui.openArtifact', {
      artifactId: artifact.id,
    })
    expect(first.status).toBe(200)

    const second = await rpc('artifacts.ui.navigate', { view: 'library' })
    const secondBody = (await second.json()) as {
      result: { intentId: string }
    }
    const pending = await app.request('/api/moldable/ui-intent', {
      headers: { 'x-moldable-workspace': workspaceId },
    })
    expect(await pending.json()).toMatchObject({
      id: secondBody.result.intentId,
      view: 'library',
    })

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${secondBody.result.intentId}`,
      {
        method: 'DELETE',
        headers: { 'x-moldable-workspace': workspaceId },
      },
    )
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
    expect(
      await (
        await app.request('/api/moldable/ui-intent', {
          headers: { 'x-moldable-workspace': workspaceId },
        })
      ).json(),
    ).toBeNull()

    expect(
      (
        await rpc('artifacts.ui.openArtifact', {
          artifactId: 'missing-artifact',
        })
      ).status,
    ).toBe(404)
  })

  it('reads clean page/deck text and starts real deck presentation', async () => {
    const page = await createArtifact(workspaceId, {
      kind: 'page',
      title: 'Readable page',
      page: { html: '<h1>Quarterly plan</h1><p>Grow carefully.</p>' },
    })
    const pageRead = await rpc('artifacts.ui.read', {
      view: 'artifact',
      entityId: page.id,
    })
    expect(await pageRead.json()).toMatchObject({
      result: {
        id: page.id,
        content: 'Quarterly plan Grow carefully.',
      },
    })

    const deck = await createArtifact(workspaceId, {
      kind: 'deck',
      title: 'Readable deck',
      slides: [
        {
          name: 'Opening',
          bodyHtml: '<h1>Welcome</h1>',
          notes: 'Pause here.',
        },
      ],
    })
    const started = await rpc('artifacts.present.start', {
      artifactId: deck.id,
    })
    expect(started.status).toBe(200)
    expect(
      await (
        await app.request('/api/moldable/ui-intent', {
          headers: { 'x-moldable-workspace': workspaceId },
        })
      ).json(),
    ).toMatchObject({
      view: 'presentation',
      entityId: deck.id,
      params: { presentation: 'start' },
    })

    const deckRead = await rpc('artifacts.ui.read', {
      entityId: deck.id,
    })
    expect(await deckRead.json()).toMatchObject({
      result: {
        slides: [
          {
            name: 'Opening',
            content: 'Welcome',
            notes: 'Pause here.',
          },
        ],
      },
    })
  })

  it('returns bounded display-ready NativeUI library and detail views', async () => {
    const artifact = await createArtifact(workspaceId, {
      kind: 'page',
      title: 'Mobile review',
      page: { html: `<h1>Plan</h1><p>${'x'.repeat(7_000)}</p>` },
    })

    const library = await rpc('artifacts.native.read', { route: 'library' })
    expect(await library.json()).toMatchObject({
      result: {
        artifacts: [
          {
            id: artifact.id,
            kindLabel: 'Web page',
            statusLabel: 'Draft',
          },
        ],
      },
    })

    const detail = await rpc('artifacts.native.read', {
      route: 'artifact',
      id: artifact.id,
    })
    const detailBody = (await detail.json()) as {
      result: {
        sections: Array<{ content: string }>
        truncationNote: string
        publishActions: Array<{ id: string }>
        unpublishActions: unknown[]
        canPublish: boolean
        canUnpublish: boolean
        draft: { title: string; subtitle: string }
        versionCountLabel: string
      }
    }
    expect(detailBody.result.sections[0]?.content.length).toBe(3_200)
    expect(detailBody.result.truncationNote).toContain('mobile excerpt')
    expect(detailBody.result.publishActions).toEqual([
      { id: artifact.id, label: 'Publish artifact' },
    ])
    expect(detailBody.result.unpublishActions).toEqual([])
    expect(detailBody.result).toMatchObject({
      canPublish: true,
      canUnpublish: false,
      draft: { title: 'Mobile review', subtitle: '' },
      versionCountLabel: '0',
    })

    await rpc('artifacts.update', {
      id: artifact.id,
      title: 'Mobile review updated',
    })
    const versions = await rpc('artifacts.native.read', {
      route: 'versions',
      id: artifact.id,
    })
    expect(await versions.json()).toMatchObject({
      result: {
        artifactId: artifact.id,
        artifactTitle: 'Mobile review updated',
        versions: [
          expect.objectContaining({
            versionId: expect.any(String),
            title: expect.any(String),
            timestamp: expect.any(String),
          }),
        ],
      },
    })
  })
})
