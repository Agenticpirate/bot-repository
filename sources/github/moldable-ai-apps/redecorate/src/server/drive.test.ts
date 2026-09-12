import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let dataDir: string
let previousDataDir: string | undefined
let app: (typeof import('./app'))['app']
let designId: string
let folderId: string

const WORKSPACE = 'redecorate-drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'redecorate-drive-'))
  previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
  const imagePath = path.join(dataDir, 'source.png')
  await writeFile(
    imagePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  )
  app = (await import('./app')).app

  const folders = await rpc('redecorate.folders.list', {})
  const foldersBody = (await folders.json()) as {
    result: Array<{ id: string }>
  }
  folderId = foldersBody.result[0]!.id

  const imported = await rpc('redecorate.images.import', {
    imagePath,
    title: 'Warm living room',
    prompt: 'Warm minimalist living room with natural oak and linen',
    folderId,
  })
  const importedBody = (await imported.json()) as {
    result: { id: string }
  }
  designId = importedBody.result.id
})

afterAll(async () => {
  if (previousDataDir === undefined) delete process.env.MOLDABLE_APP_DATA_DIR
  else process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
  await rm(dataDir, { recursive: true, force: true })
})

describe('redecorate drive contract', () => {
  it('describes the complete navigable surface', async () => {
    const response = await rpc('redecorate.ui.describe', {})
    const body = (await response.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(response.status).toBe(200)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'home',
      'all',
      'favorites',
      'folder',
      'design',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 25),
    ).toBe(true)
  })

  it('reads a last-wins navigation intent without consuming it, then acknowledges it', async () => {
    await rpc('redecorate.ui.navigate', { view: 'home' })
    const navigate = await rpc('redecorate.ui.navigate', {
      view: 'design',
      entityId: designId,
    })
    const body = (await navigate.json()) as {
      result: { intentId: string }
    }

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as {
      id: string
      view: string
      entityId?: string
    }
    expect(intent.id).toBe(body.result.intentId)
    expect(intent.view).toBe('design')
    expect(intent.entityId).toBe(designId)

    const secondGetResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await secondGetResponse.json()).toEqual(intent)

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await ack.json()) as { deleted: boolean }).deleted).toBe(true)

    const secondAck = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await secondAck.json()) as { deleted: boolean }).deleted).toBe(
      false,
    )
  })

  it('opens designs and folders through signature scopes', async () => {
    const open = await rpc('redecorate.ui.openDesign', { designId })
    expect(open.status).toBe(200)
    expect(
      ((await open.json()) as { result: { designId: string } }).result.designId,
    ).toBe(designId)

    const show = await rpc('redecorate.ui.showFolder', { folderId })
    expect(show.status).toBe(200)
    expect(
      ((await show.json()) as { result: { folderId: string } }).result.folderId,
    ).toBe(folderId)
  })

  it('reads design metadata and prompt/style summary', async () => {
    const response = await rpc('redecorate.ui.read', {
      view: 'design',
      entityId: designId,
    })
    const body = (await response.json()) as {
      result: {
        design: {
          title: string
          promptSummary: {
            prompt: string
            style: unknown
          }
          iterations: Array<{ prompt: string }>
        }
      }
    }
    expect(response.status).toBe(200)
    expect(body.result.design.title).toBe('Warm living room')
    expect(body.result.design.promptSummary.prompt).toContain(
      'Warm minimalist living room',
    )
    expect(body.result.design.promptSummary.style).toBeNull()
    expect(body.result.design.iterations[0]?.prompt).toContain(
      'Warm minimalist living room',
    )
  })

  it('Zod-rejects an unknown view', async () => {
    const response = await rpc('redecorate.ui.navigate', { view: 'moodboard' })
    expect(response.status).toBe(400)
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe('invalid_params')
  })

  it('projects bounded route-specific NativeUI design data', async () => {
    const home = await rpc('redecorate.native.read', { route: 'home' })
    const homeBody = (await home.json()) as {
      result: {
        collections: Array<{
          id: string
          imageURL: string
        }>
      }
    }
    expect(homeBody.result.collections.length).toBeGreaterThan(0)
    expect(
      homeBody.result.collections
        .map((collection) => collection.imageURL)
        .filter(Boolean)
        .every((image) => image.startsWith('assets/')),
    ).toBe(true)
    expect(
      homeBody.result.collections
        .map((collection) => collection.imageURL)
        .filter(Boolean),
    ).toHaveLength(2)

    const detail = await rpc('redecorate.native.read', {
      route: 'design',
      id: designId,
    })
    const detailBody = (await detail.json()) as {
      result: Record<string, unknown> & {
        id: string
        imageURL: string
        favoriteActions: unknown[]
      }
    }
    expect(detailBody.result.id).toBe(designId)
    expect(detailBody.result.imageURL).toMatch(/^assets\//)
    expect(JSON.stringify(detailBody.result)).not.toContain('/Users/')
    expect(detailBody.result.favoriteActions).toHaveLength(1)
    expect(detailBody.result).not.toHaveProperty('iterations')
  })

  it('returns a bounded receipt for the allowed native favorite action', async () => {
    const response = await rpc('redecorate.native.mutate', {
      action: 'favorite',
      id: designId,
      favorite: true,
    })
    expect((await response.json()) as unknown).toEqual({
      ok: true,
      result: {
        ok: true,
        id: designId,
        favorite: true,
        notices: [{ title: 'Added to favorites', message: 'Warm living room' }],
      },
    })

    const detail = await rpc('redecorate.native.read', {
      route: 'design',
      id: designId,
    })
    const detailBody = (await detail.json()) as {
      result: { stateTags: string[] }
    }
    expect(detailBody.result.stateTags).toContain('Favorite')
  })

  it('rejects incomplete and unbounded native reads', async () => {
    const missing = (await (
      await rpc('redecorate.native.read', { route: 'design' })
    ).json()) as { ok: boolean; error: { code: string } }
    expect(missing.ok).toBe(false)
    expect(missing.error.code).toBe('invalid_params')

    const unbounded = (await (
      await rpc('redecorate.native.read', { route: 'home', limit: 17 })
    ).json()) as { ok: boolean; error: { code: string } }
    expect(unbounded.ok).toBe(false)
    expect(unbounded.error.code).toBe('invalid_params')
  })
})

describe('Redecorate NativeUI package boundary', () => {
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
