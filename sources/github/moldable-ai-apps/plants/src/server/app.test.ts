import type { Plant } from '../lib/types'
import { app } from './app'
import { projectNativeDetail } from './native-ui-api'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

let tempHome: string | undefined

function request(
  path: string,
  init: RequestInit = {},
  workspaceId = 'review',
): Request {
  const headers = new Headers(init.headers)
  headers.set('x-moldable-workspace-id', workspaceId)
  headers.set('x-moldable-workspace', workspaceId)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return new Request(`http://plants.test${path}`, {
    ...init,
    headers,
  })
}

async function json<T>(response: Response): Promise<T> {
  expect(response.ok).toBe(true)
  return (await response.json()) as T
}

describe('Plants server mutations', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'plants-app-'))
    process.env = { ...originalEnv }
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'plants'
    delete process.env.MOLDABLE_APP_DATA_DIR
    delete process.env.MOLDABLE_APP_TOKEN
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    process.env = originalEnv
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true })
      tempHome = undefined
    }
  })

  it('binds plant cards to the selection and rejects duplicate watering from another client', async () => {
    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Monstera',
            waterIntervalDays: 7,
          }),
        }),
      ),
    )
    const rpc = (method: string, params: unknown, workspaceId = 'review') =>
      app.fetch(
        request(
          '/api/moldable/rpc',
          { method: 'POST', body: JSON.stringify({ method, params }) },
          workspaceId,
        ),
      )
    const presented = await json<{
      ok: boolean
      result: { appCard: { input: { plantIds: string[] } } }
    }>(await rpc('plants.cards.present', { plantIds: [plant.id] }))
    expect(presented.result.appCard.input).toEqual({ plantIds: [plant.id] })
    const fields = {
      plantIds: [plant.id],
      plantId: plant.id,
      expectedUpdatedAt: plant.updatedAt,
    }
    const results = await Promise.all([
      rpc('plants.cards.water', fields),
      rpc('plants.cards.water', fields),
    ])
    const bodies = await Promise.all(results.map((response) => response.json()))
    expect(bodies.filter((body) => body.ok)).toHaveLength(1)
    const current = await json<{ result: { plants: Plant[] } }>(
      await rpc('plants.cards.read', { plantIds: [plant.id] }),
    )
    expect(current.result.plants[0]?.lastWateredAt).toBeDefined()
    const foreign = await rpc('plants.cards.water', {
      ...fields,
      plantIds: ['another'],
    })
    expect((await foreign.json()).ok).toBe(false)
    const other = await json<{ result: { plants: Plant[] } }>(
      await rpc('plants.cards.read', { plantIds: [plant.id] }, 'work'),
    )
    expect(other.result.plants).toHaveLength(0)
  })

  it('preserves concurrent plant creates in the same workspace', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        app.fetch(
          request('/api/plants', {
            method: 'POST',
            body: JSON.stringify({ commonName: `Plant ${index + 1}` }),
          }),
        ),
      ),
    )

    const plants = await json<Plant[]>(await app.fetch(request('/api/plants')))

    expect(plants).toHaveLength(8)
    expect(new Set(plants.map((plant) => plant.commonName)).size).toBe(8)
  })

  it('preserves concurrent watering updates for different plants', async () => {
    const [first, second] = await Promise.all(
      ['Aloe', 'Pothos'].map(async (commonName) =>
        json<Plant>(
          await app.fetch(
            request('/api/plants', {
              method: 'POST',
              body: JSON.stringify({ commonName, waterIntervalDays: 7 }),
            }),
          ),
        ),
      ),
    )

    await Promise.all([
      app.fetch(
        request(`/api/plants/${first.id}/water`, {
          method: 'POST',
          body: JSON.stringify({ at: '2026-06-01T10:00:00.000Z' }),
        }),
      ),
      app.fetch(
        request(`/api/plants/${second.id}/water`, {
          method: 'POST',
          body: JSON.stringify({ at: '2026-06-01T11:00:00.000Z' }),
        }),
      ),
    ])

    const plants = await json<Plant[]>(await app.fetch(request('/api/plants')))

    expect(plants.find((plant) => plant.id === first.id)?.lastWateredAt).toBe(
      '2026-06-01T10:00:00.000Z',
    )
    expect(plants.find((plant) => plant.id === second.id)?.lastWateredAt).toBe(
      '2026-06-01T11:00:00.000Z',
    )
  })

  it('keeps wishlist plants out of care tracking until acquired', async () => {
    const wishlist = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Purple coneflower',
            ownershipStatus: 'wishlist',
            room: 'Garden',
            location: 'Wishlist — not yet owned',
            waterIntervalDays: 7,
            care: { water: { intervalDays: 7 } },
          }),
        }),
      ),
    )

    expect(wishlist.ownershipStatus).toBe('wishlist')
    expect(wishlist.room).toBeUndefined()
    expect(wishlist.waterIntervalDays).toBe(0)

    const today = await json<{ items: unknown[] }>(
      await app.fetch(request('/api/moldable/today')),
    )
    expect(today.items).toEqual([])

    const acquired = await json<Plant>(
      await app.fetch(
        request(`/api/plants/${wishlist.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ownershipStatus: 'owned' }),
        }),
      ),
    )

    expect(acquired.ownershipStatus).toBe('owned')
    expect(acquired.acquiredAt).toBeTruthy()
    expect(acquired.waterIntervalDays).toBe(7)
    expect(acquired.location).toBeUndefined()
  })

  it('returns a fresh epitaph for memorials without changing plant data', async () => {
    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({ commonName: 'Aloe' }),
        }),
      ),
    )

    const memorial = await json<Plant>(
      await app.fetch(
        request(`/api/plants/${plant.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            lifeStatus: 'deceased',
            deceasedAt: '2026-08-01T12:00:00.000Z',
          }),
        }),
      ),
    )

    const response = await app.fetch(
      request('/api/moldable/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'plants.native.mutate',
          params: { action: 'refreshMemorialEulogy', id: plant.id },
        }),
      }),
    )
    expect(response.status).toBe(200)
    expect(
      await json<{ ok: boolean; result: { id: string } }>(response),
    ).toEqual({
      ok: true,
      result: { id: plant.id },
    })

    const detail = projectNativeDetail(
      memorial,
      new Date('2026-08-02T12:01:00.000Z'),
      'plant',
    ) as {
      isMemorial: boolean
      memorialEulogyActions: Array<{ plantId: string; label: string }>
    }
    expect(detail.isMemorial).toBe(true)
    expect(detail.memorialEulogyActions).toEqual([
      { plantId: memorial.id, label: 'Show another epitaph' },
    ])
  })

  it('moves deceased plants into a reversible memorial state and stops care prompts', async () => {
    const created = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Sweet basil',
            room: 'Kitchen',
            waterIntervalDays: 3,
            care: {},
          }),
        }),
      ),
    )

    const deceasedAt = '2026-08-04T12:00:00.000Z'
    const memorial = await json<Plant>(
      await app.fetch(
        request(`/api/plants/${created.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            lifeStatus: 'deceased',
            deceasedAt,
            memorialNote: 'A valiant little pesto plant.',
          }),
        }),
      ),
    )

    expect(memorial).toMatchObject({
      lifeStatus: 'deceased',
      deceasedAt,
      memorialNote: 'A valiant little pesto plant.',
      waterIntervalDays: 3,
    })
    const today = await json<{ items: unknown[] }>(
      await app.fetch(request('/api/moldable/today')),
    )
    expect(today.items).toEqual([])
    expect(
      (
        await app.fetch(
          request(`/api/plants/${created.id}/water`, { method: 'POST' }),
        )
      ).status,
    ).toBe(404)

    const restored = await json<Plant>(
      await app.fetch(
        request(`/api/plants/${created.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ lifeStatus: 'active' }),
        }),
      ),
    )
    expect(restored.lifeStatus).toBe('active')
    expect(restored.deceasedAt).toBeUndefined()
    expect(restored.memorialNote).toBeUndefined()
    expect(restored.waterIntervalDays).toBe(3)
  })

  it('resyncs watering schedules after notification access is granted', async () => {
    await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Monstera',
            waterIntervalDays: 7,
            care: {},
          }),
        }),
      ),
    )

    process.env.MOLDABLE_AI_SERVER_URL = 'http://127.0.0.1:39200'
    process.env.MOLDABLE_APP_TOKEN = 'app-capability'
    const notificationHost = vi.fn(async () =>
      Response.json({ ok: true, count: 1 }),
    )
    vi.stubGlobal('fetch', notificationHost)

    const result = await json<{ ok: true; scheduleCount: number }>(
      await app.fetch(
        request('/api/notifications/sync', {
          method: 'POST',
        }),
      ),
    )

    expect(result).toEqual({ ok: true, scheduleCount: 1 })
    expect(notificationHost).toHaveBeenCalledWith(
      'http://127.0.0.1:39200/api/notifications/schedules',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'x-moldable-app-id': 'plants',
          'x-moldable-app-token': 'app-capability',
        }),
      }),
    )
  })
})

describe('Plants drive contract', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'plants-app-'))
    process.env = { ...originalEnv }
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'plants'
    delete process.env.MOLDABLE_APP_DATA_DIR
    delete process.env.MOLDABLE_APP_TOKEN
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    process.env = originalEnv
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true })
      tempHome = undefined
    }
  })

  async function rpc(method: string, params?: unknown): Promise<Response> {
    return app.fetch(
      request('/api/moldable/rpc', {
        method: 'POST',
        body: JSON.stringify(
          params === undefined ? { method } : { method, params },
        ),
      }),
    )
  }

  it('describes every navigable view for a model reader', async () => {
    const body = await json<{
      ok: boolean
      result: { views: { id: string; name: string; description: string }[] }
    }>(await rpc('plants.ui.describe'))

    expect(body.ok).toBe(true)
    const ids = body.result.views.map((view) => view.id)
    expect(ids).toEqual(
      expect.arrayContaining(['home', 'all', 'room', 'search', 'plant']),
    )
    for (const view of body.result.views) {
      expect(view.description.length).toBeGreaterThan(20)
    }
  })

  it('queues, exposes, and acks a navigation intent with last-wins semantics', async () => {
    const first = await json<{ result: { intentId: string } }>(
      await rpc('plants.ui.navigate', { view: 'favorites' }),
    )
    const second = await json<{ result: { intentId: string } }>(
      await rpc('plants.ui.showGallery', {}),
    )

    const intent = await json<{ id: string; view: string } | null>(
      await app.fetch(request('/api/moldable/ui-intent')),
    )
    expect(intent?.id).toBe(second.result.intentId)
    expect(intent?.view).toBe('all')

    // Ack with a stale id leaves the newer intent in place.
    const stale = await json<{ ok: boolean; cleared: boolean }>(
      await app.fetch(
        request(`/api/moldable/ui-intent?id=${first.result.intentId}`, {
          method: 'DELETE',
        }),
      ),
    )
    expect(stale.cleared).toBe(false)

    const ack = await json<{ ok: boolean; cleared: boolean }>(
      await app.fetch(
        request(`/api/moldable/ui-intent?id=${second.result.intentId}`, {
          method: 'DELETE',
        }),
      ),
    )
    expect(ack.cleared).toBe(true)

    const after = await json<null>(
      await app.fetch(request('/api/moldable/ui-intent')),
    )
    expect(after).toBeNull()
  })

  it('rejects invalid navigation targets', async () => {
    expect((await rpc('plants.ui.navigate', { view: 'nope' })).status).toBe(400)
    expect((await rpc('plants.ui.navigate', { view: 'plant' })).status).toBe(
      400,
    )
    expect((await rpc('plants.ui.navigate', { view: 'room' })).status).toBe(400)
    expect(
      (await rpc('plants.ui.navigate', { view: 'plant', entityId: 'missing' }))
        .status,
    ).toBe(404)
  })

  it('showPlant validates the plant and queues a fullscreen intent', async () => {
    expect((await rpc('plants.ui.showPlant', { plantId: 'nope' })).status).toBe(
      404,
    )

    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Monstera',
            waterIntervalDays: 7,
            care: {},
          }),
        }),
      ),
    )

    const shown = await json<{ result: { intentId: string } }>(
      await rpc('plants.ui.showPlant', { plantId: plant.id, fullscreen: true }),
    )

    const intent = await json<{
      id: string
      view: string
      entityId?: string
      params?: { fullscreen?: boolean }
    }>(await app.fetch(request('/api/moldable/ui-intent')))

    expect(intent).toMatchObject({
      id: shown.result.intentId,
      view: 'plant',
      entityId: plant.id,
      params: { fullscreen: true },
    })
  })

  it('reads plants and the collection as clean speakable text', async () => {
    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Aloe vera',
            scientificName: 'Aloe barbadensis',
            room: 'Kitchen',
            waterIntervalDays: 7,
            care: { summary: 'Bright light and **sparse** watering.' },
          }),
        }),
      ),
    )

    const single = await json<{ result: { text: string } }>(
      await rpc('plants.ui.read', { entityId: plant.id }),
    )
    expect(single.result.text).toContain('Aloe vera')
    expect(single.result.text).toContain('Kitchen')
    expect(single.result.text).toContain('watering')
    expect(single.result.text).not.toMatch(/[*_`#<>[\]]/)

    const gallery = await json<{ result: { text: string } }>(
      await rpc('plants.ui.read'),
    )
    expect(gallery.result.text).toContain('collection')
    expect(gallery.result.text).not.toMatch(/[*_`#<>[\]]/)

    expect((await rpc('plants.ui.read', { entityId: 'missing' })).status).toBe(
      404,
    )
  })

  it('projects the React home hierarchy and conditional collection affordances', async () => {
    const empty = await json<{
      result: {
        folders: unknown[]
        folderNotices: unknown[]
        emptyStates: { title: string }[]
      }
    }>(await rpc('plants.native.read', { route: 'home' }))
    expect(empty.result.folders).toEqual([])
    expect(empty.result.folderNotices).toEqual([])
    expect(empty.result.emptyStates).toEqual([
      expect.objectContaining({ title: 'No plants yet' }),
    ])

    const owned = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Monstera',
            scientificName: 'Monstera deliciosa',
            room: 'Living room',
            heroImagePath: 'assets/monstera.jpg',
            waterIntervalDays: 7,
            care: { light: 'Bright indirect light' },
          }),
        }),
      ),
    )
    await json(
      await rpc('plants.native.mutate', {
        action: 'favorite',
        id: owned.id,
        isFavorite: true,
      }),
    )
    await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'String of hearts',
            ownershipStatus: 'wishlist',
            heroImagePath: 'assets/string-of-hearts.jpg',
            care: {},
          }),
        }),
      ),
    )

    const home = await json<{
      result: {
        folders: { title: string; heroImageUrl: string }[]
        folderNotices: unknown[]
        emptyStates: unknown[]
      }
    }>(await rpc('plants.native.read', { route: 'home' }))
    expect(home.result.folders.map((folder) => folder.title)).toEqual(
      expect.arrayContaining([
        'All plants',
        'Future Plants',
        'Favorites',
        'Living room',
      ]),
    )
    expect(home.result.folders).toHaveLength(4)
    expect(home.result.folderNotices).toEqual([])
    expect(home.result.emptyStates).toEqual([])

    const collection = await json<{
      result: {
        title: string
        truncationNotices: unknown[]
        plants: Array<{
          id: string
          heroImageUrl: string
          favoriteLabel: string
          favoriteValue: boolean
        }>
      }
    }>(
      await rpc('plants.native.read', {
        route: 'collection',
        view: 'all',
        room: '',
        query: '',
        limit: 16,
      }),
    )
    expect(collection.result.title).toBe('All plants')
    expect(collection.result.truncationNotices).toEqual([])
    expect(collection.result.plants).toEqual([
      expect.objectContaining({
        id: owned.id,
        heroImageUrl: 'assets/monstera.jpg',
        favoriteLabel: 'Remove from Favorites',
        favoriteValue: false,
      }),
    ])

    const wishlist = await json<{
      result: { sectionTitle: string; plants: Array<{ favoriteLabel: string }> }
    }>(
      await rpc('plants.native.read', {
        route: 'collection',
        view: 'wishlist',
        room: '',
        limit: 16,
      }),
    )
    expect(wishlist.result.sectionTitle).toBe('Saved for later')
    expect(wishlist.result.plants[0]?.favoriteLabel).toBe('Add to Favorites')
  })

  it('keeps every native detail view route-specific and within 16 assets', async () => {
    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Rubber plant',
            heroImagePath: 'assets/hero.jpg',
            notes: '![old photo](assets/private-note.jpg) Grew two leaves.',
            waterIntervalDays: 7,
            care: {
              summary: 'Steady and forgiving.',
              light: 'Bright indirect light',
              humidity: 'Average home humidity',
              careMarkdown:
                'Keep near a window. ![diagram](assets/private-guide.jpg)',
              commonProblems: ['Leaf drop', 'Brown edges'],
            },
          }),
        }),
      ),
    )
    for (let index = 0; index < 18; index += 1) {
      await json<Plant>(
        await app.fetch(
          request(`/api/plants/${plant.id}/photos`, {
            method: 'POST',
            body: JSON.stringify({
              path: `assets/growth-${index}.jpg`,
              caption: `Week ${index + 1}`,
            }),
          }),
        ),
      )
    }

    const detail = await json<{
      result: Record<string, unknown> & {
        heroImageUrl: string
        scientificNames: unknown[]
        notes: Array<{ text: string }>
      }
    }>(await rpc('plants.native.read', { id: plant.id, route: 'plant' }))
    expect(detail.result.heroImageUrl).toBe('assets/growth-17.jpg')
    expect(detail.result).not.toHaveProperty('photos')
    expect(detail.result).not.toHaveProperty('careTiles')
    expect(detail.result.scientificNames).toEqual([])
    expect(detail.result.notes[0]?.text).not.toContain('assets/')

    const care = await json<{
      result: Record<string, unknown> & {
        careGeneratedLabels: unknown[]
        careGuideSections: Array<{ text: string }>
      }
    }>(await rpc('plants.native.read', { id: plant.id, route: 'care' }))
    expect(care.result).not.toHaveProperty('heroImageUrl')
    expect(care.result).not.toHaveProperty('photos')
    expect(care.result.careGeneratedLabels).toEqual([])
    expect(care.result.careGuideSections.at(-1)?.text).not.toContain('assets/')

    const journal = await json<{
      result: Record<string, unknown> & {
        photos: Array<{ path: string }>
        journalNotice: string
      }
    }>(await rpc('plants.native.read', { id: plant.id, route: 'journal' }))
    expect(journal.result.photos).toHaveLength(16)
    expect(new Set(journal.result.photos.map((photo) => photo.path)).size).toBe(
      16,
    )
    expect(journal.result).not.toHaveProperty('heroImageUrl')
    expect(journal.result).not.toHaveProperty('careTiles')
    expect(journal.result.journalNotice).toContain('16 most recent')
  })

  it('returns bounded receipts for the allowed native mutations', async () => {
    const plant = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Aloe',
            heroImagePath: 'assets/aloe.jpg',
            waterIntervalDays: 7,
            care: {},
          }),
        }),
      ),
    )

    const watered = await json<{
      result: {
        ok: boolean
        id: string
        wateredAt: string
        notices: Array<{ title: string; message: string }>
      }
    }>(
      await rpc('plants.native.mutate', {
        action: 'water',
        id: plant.id,
        at: '2026-08-02T12:00:00.000Z',
      }),
    )
    expect(watered.result).toEqual({
      ok: true,
      id: plant.id,
      wateredAt: '2026-08-02T12:00:00.000Z',
      notices: [
        {
          title: 'Watering recorded',
          message: 'Aloe is up to date.',
        },
      ],
    })
    expect(JSON.stringify(watered.result)).not.toContain('assets/')

    const wateredPlant = await json<Plant>(
      await app.fetch(request(`/api/plants/${plant.id}`)),
    )
    const detail = projectNativeDetail(
      wateredPlant,
      new Date('2026-08-02T12:01:00.000Z'),
      'plant',
    ) as {
      waterInfoPanels: unknown[]
      waterSuccessPanels: Array<{ title: string; message: string }>
      waterActions: unknown[]
      memorialEulogyActions: unknown[]
      waterHistorySections: Array<{ items: Array<{ timestamp: string }> }>
    }
    expect(detail.waterInfoPanels).toEqual([])
    expect(detail.waterSuccessPanels).toEqual([
      expect.objectContaining({
        title: 'Watered today',
        message: expect.stringContaining('Next watering in 7 days'),
      }),
    ])
    expect(detail.waterActions).toEqual([])
    expect(detail.memorialEulogyActions).toEqual([])
    expect(detail.waterHistorySections[0]?.items[0]?.timestamp).toBe('Today')

    const favorite = await json<{
      result: {
        ok: boolean
        id: string
        isFavorite: boolean
        notices: Array<{ title: string; message: string }>
      }
    }>(
      await rpc('plants.native.mutate', {
        action: 'favorite',
        id: plant.id,
        isFavorite: true,
      }),
    )
    expect(favorite.result).toEqual({
      ok: true,
      id: plant.id,
      isFavorite: true,
      notices: [{ title: 'Added to favorites', message: 'Aloe' }],
    })
  })

  it('supports confirmed important acquisition and care actions with inline receipts', async () => {
    const wishlist = await json<Plant>(
      await app.fetch(
        request('/api/plants', {
          method: 'POST',
          body: JSON.stringify({
            commonName: 'Calathea',
            ownershipStatus: 'wishlist',
            care: {},
          }),
        }),
      ),
    )

    const acquired = await json<{
      result: {
        ownershipStatus: string
        notices: Array<{ title: string }>
      }
    }>(await rpc('plants.native.acquire', { id: wishlist.id }))
    expect(acquired.result.ownershipStatus).toBe('owned')
    expect(acquired.result.notices[0]?.title).toBe('Added to your plants')

    process.env.MOLDABLE_APP_TOKEN = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            json: {
              summary: 'Keep the soil lightly moist.',
              water: { intervalDays: 7 },
              careMarkdown: 'Water when the surface begins to dry.',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const generated = await json<{
      result: { notices: Array<{ title: string }> }
    }>(await rpc('plants.native.generateCare', { id: wishlist.id }))
    expect(generated.result.notices[0]?.title).toBe('Care guide updated')

    const detail = await json<Plant>(
      await app.fetch(request(`/api/plants/${wishlist.id}`)),
    )
    expect(detail.ownershipStatus).toBe('owned')
    expect(detail.care?.generatedAt).toBeTruthy()
  })

  it('supports the mobile search, manual create, edit, care-state, media, identification, and confirmed delete workflows', async () => {
    const created = await json<{
      result: { id: string; notices: Array<{ title: string }> }
    }>(
      await rpc('plants.native.create', {
        commonName: 'Window fern',
        ownershipStatus: 'owned',
        scientificName: 'Nephrolepis exaltata',
        room: 'Office',
      }),
    )
    expect(created.result.notices[0]?.title).toBe('Plant added')

    const updated = await json<{
      result: { notices: Array<{ title: string }> }
    }>(
      await rpc('plants.native.update', {
        id: created.result.id,
        commonName: 'Boston fern',
        scientificName: 'Nephrolepis exaltata',
        room: 'Office',
        location: 'North windowsill',
        notes: 'Mist when the room is dry.',
        waterIntervalDays: 5,
      }),
    )
    expect(updated.result.notices[0]?.title).toBe('Plant updated')

    const search = await json<{
      result: { plants: Array<{ id: string; commonName: string }> }
    }>(
      await rpc('plants.native.read', {
        route: 'collection',
        view: 'search',
        query: 'windowsill',
        limit: 16,
      }),
    )
    expect(search.result.plants).toEqual([
      expect.objectContaining({
        id: created.result.id,
        commonName: 'Boston fern',
      }),
    ])

    const snoozed = await json<{
      result: { snoozeUntil: string; notices: Array<{ title: string }> }
    }>(await rpc('plants.native.snooze', { id: created.result.id, days: 2 }))
    expect(new Date(snoozed.result.snoozeUntil).getTime()).toBeGreaterThan(
      Date.now(),
    )
    expect(snoozed.result.notices[0]?.title).toBe('Watering reminder moved')

    await json<Plant>(
      await app.fetch(
        request(`/api/plants/${created.result.id}/photos`, {
          method: 'POST',
          body: JSON.stringify({ path: 'assets/fern-closeup.jpg' }),
        }),
      ),
    )
    const portrait = await json<{
      result: { notices: Array<{ title: string }> }
    }>(
      await rpc('plants.native.setHero', {
        id: created.result.id,
        path: 'assets/fern-closeup.jpg',
      }),
    )
    expect(portrait.result.notices[0]?.title).toBe('Portrait updated')
    expect(
      (
        await rpc('plants.native.setHero', {
          id: created.result.id,
          path: 'assets/not-in-this-journal.jpg',
        })
      ).status,
    ).toBe(400)

    await json<Plant>(
      await app.fetch(
        request(`/api/plants/${created.result.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            scientificName: 'Nephrolepis cordifolia',
            identification: {
              source: 'vision',
              candidates: [
                {
                  name: 'Nephrolepis exaltata',
                  commonName: 'Boston fern',
                },
              ],
            },
          }),
        }),
      ),
    )
    const confirmed = await json<{
      result: { notices: Array<{ title: string }> }
    }>(
      await rpc('plants.native.confirmIdentification', {
        id: created.result.id,
        scientificName: 'Nephrolepis exaltata',
        commonName: 'Boston fern',
      }),
    )
    expect(confirmed.result.notices[0]?.title).toBe('Identification confirmed')
    expect(
      (
        await rpc('plants.native.confirmIdentification', {
          id: created.result.id,
          scientificName: 'Invented species',
        })
      ).status,
    ).toBe(400)

    const deleted = await json<{
      result: { notices: Array<{ title: string }> }
    }>(await rpc('plants.native.delete', { id: created.result.id }))
    expect(deleted.result.notices[0]?.title).toBe('Plant deleted')
    expect(
      (
        await rpc('plants.native.read', {
          route: 'plant',
          id: created.result.id,
        })
      ).status,
    ).toBe(404)
  })

  it('rejects incomplete or unbounded native requests', async () => {
    expect(
      (await rpc('plants.native.read', { route: 'collection', limit: 17 }))
        .status,
    ).toBe(400)
    expect((await rpc('plants.native.read', { route: 'journal' })).status).toBe(
      400,
    )
    expect(
      (
        await rpc('plants.native.mutate', {
          action: 'favorite',
          id: 'plant-id',
        })
      ).status,
    ).toBe(400)
  })
})

describe('Plants NativeUI package boundary', () => {
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
