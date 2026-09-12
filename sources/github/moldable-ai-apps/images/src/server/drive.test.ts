import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  temporaryHome = await mkdtemp(path.join(tmpdir(), 'images-drive-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'images'
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

describe('Images drive contract', () => {
  it('describes its model-readable views', async () => {
    const response = await rpc('images.ui.describe', {})
    const body = (await response.json()) as {
      ok: boolean
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(body.ok).toBe(true)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'gallery',
      'image',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 30),
    ).toBe(true)
  })

  it('queues, replaces, reads, and acknowledges UI intents', async () => {
    const first = await rpc('images.ui.navigate', { view: 'gallery' })
    expect(first.status).toBe(200)
    const second = await rpc('images.ui.showGallery', {})
    const secondBody = (await second.json()) as {
      result: { intentId: string }
    }

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as ImagesUiIntent
    expect(intent.id).toBe(secondBody.result.intentId)
    expect(intent.view).toBe('gallery')

    const wrongAck = await app.request(
      '/api/moldable/ui-intent?id=not-current',
      { method: 'DELETE', headers: HEADERS },
    )
    expect(await wrongAck.json()).toEqual({ ok: true, deleted: false })

    const ack = await app.request(`/api/moldable/ui-intent?id=${intent.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
    expect(
      await (
        await app.request('/api/moldable/ui-intent', { headers: HEADERS })
      ).json(),
    ).toBeNull()
  })

  it('returns a clean empty collection summary and rejects invalid views', async () => {
    const read = await rpc('images.ui.read', { view: 'gallery' })
    const body = (await read.json()) as {
      ok: boolean
      result: { collection: { threadCount: number; imageCount: number } }
    }
    expect(body.ok).toBe(true)
    expect(body.result.collection).toMatchObject({
      threadCount: 0,
      imageCount: 0,
    })

    const invalid = await rpc('images.ui.navigate', { view: 'settings' })
    const invalidBody = (await invalid.json()) as {
      ok: boolean
      error: { code: string }
    }
    expect(invalidBody.ok).toBe(false)
    expect(invalidBody.error.code).toBe('invalid_params')
  })

  it('returns a bounded native gallery and validates detail routes', async () => {
    const response = await rpc('images.native.read', {
      route: 'gallery',
      limit: 16,
    })
    const body = (await response.json()) as {
      ok: boolean
      result: { summary: string; images: unknown[]; emptyStates: unknown[] }
    }
    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.images).toEqual([])
    expect(body.result.emptyStates).toHaveLength(1)

    const invalid = await rpc('images.native.read', { route: 'thread' })
    const invalidBody = (await invalid.json()) as {
      ok: boolean
      error: { code: string }
    }
    expect(invalidBody.ok).toBe(false)
    expect(invalidBody.error.code).toBe('invalid_params')
  })
})

type ImagesUiIntent = {
  id: string
  view: string
}
