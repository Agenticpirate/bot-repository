import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let dataDir: string
let previousDataDir: string | undefined
let app: (typeof import('./app'))['app']
let deckId: string

const WORKSPACE = 'slides-drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'slides-drive-'))
  previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
  app = (await import('./app')).app

  const response = await rpc('slides.decks.create', {
    title: 'Launch proposal',
    subtitle: 'A clear path to value',
    slides: [
      {
        name: 'Opening',
        bodyHtml:
          '<section><h1>Grow revenue &amp; confidence</h1><p>One plan.</p></section>',
        notes: 'Welcome the customer and frame the opportunity.',
      },
      {
        name: 'Proof',
        bodyHtml:
          '<div><h2>Proven impact</h2><ul><li>42% faster</li><li>3× adoption</li></ul></div>',
        notes: 'Pause after each result.',
      },
      {
        name: 'Close',
        bodyHtml: '<h2>Start this quarter</h2>',
        notes: 'Ask for the next meeting.',
      },
    ],
  })
  const body = (await response.json()) as { result: { id: string } }
  deckId = body.result.id
})

afterAll(async () => {
  if (previousDataDir === undefined) delete process.env.MOLDABLE_APP_DATA_DIR
  else process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
  await rm(dataDir, { recursive: true, force: true })
})

describe('slides drive contract', () => {
  it('projects bounded native library, outline, and slide routes', async () => {
    const library = (await (
      await rpc('slides.native.read', { route: 'library', limit: 24 })
    ).json()) as { result: { decks: Array<{ id: string }> } }
    expect(library.result.decks.some((deck) => deck.id === deckId)).toBe(true)

    const outline = (await (
      await rpc('slides.native.read', { route: 'deck', deckId, limit: 24 })
    ).json()) as {
      result: {
        slides: Array<{ deckId: string; index: number }>
        publishActions: Array<{ id: string }>
      }
    }
    expect(outline.result.slides).toHaveLength(3)
    expect(outline.result.slides[1]).toMatchObject({ deckId, index: 1 })
    expect(outline.result.publishActions).toEqual([
      { id: deckId, label: 'Publish deck' },
    ])

    const slide = (await (
      await rpc('slides.native.read', { route: 'slide', deckId, slideIndex: 1 })
    ).json()) as {
      result: {
        title: string
        previousRoutes: unknown[]
        nextRoutes: unknown[]
      }
    }
    expect(slide.result.title).toBe('Proof')
    expect(slide.result.previousRoutes).toHaveLength(1)
    expect(slide.result.nextRoutes).toHaveLength(1)
  })

  it('describes every navigable view for a language model', async () => {
    const response = await rpc('slides.ui.describe', {})
    const body = (await response.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(response.status).toBe(200)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'decks',
      'editor',
      'presentation',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 25),
    ).toBe(true)
  })

  it('queues, replaces, exposes, and acknowledges navigation', async () => {
    await rpc('slides.ui.navigate', { view: 'decks' })
    const navigate = await rpc('slides.ui.navigate', {
      view: 'editor',
      entityId: deckId,
      params: { slideIndex: 1 },
    })
    const navigateBody = (await navigate.json()) as {
      result: { intentId: string }
    }
    expect(navigate.status).toBe(200)

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as {
      id: string
      view: string
      entityId?: string
      params?: { slideIndex?: number }
    }
    expect(intent).toMatchObject({
      id: navigateBody.result.intentId,
      view: 'editor',
      entityId: deckId,
      params: { slideIndex: 1 },
    })

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await ack.json()) as { deleted: boolean }).deleted).toBe(true)
    const after = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await after.json()).toBeNull()
  })

  it('reads clean slide text and speaker notes without HTML', async () => {
    const response = await rpc('slides.ui.read', {
      deckId,
      slideIndex: 1,
    })
    const body = (await response.json()) as {
      result: {
        deck: {
          slide: { index: number; text: string; speakerNotes: string }
        }
      }
    }
    expect(response.status).toBe(200)
    expect(body.result.deck.slide).toEqual(
      expect.objectContaining({
        index: 1,
        text: 'Proven impact\n• 42% faster\n• 3× adoption',
        speakerNotes: 'Pause after each result.',
      }),
    )
    expect(body.result.deck.slide.text).not.toContain('<')
  })

  it('models native presentation position for all signature controls', async () => {
    const start = await rpc('slides.present.start', { deckId })
    expect((await start.json()) as unknown).toMatchObject({
      result: { deckId, slideIndex: 0 },
    })
    const next = await rpc('slides.present.next', {})
    expect((await next.json()) as unknown).toMatchObject({
      result: { deckId, slideIndex: 1 },
    })
    const goTo = await rpc('slides.present.goto', { slideIndex: 2 })
    expect((await goTo.json()) as unknown).toMatchObject({
      result: { deckId, slideIndex: 2 },
    })
    const previous = await rpc('slides.present.prev', {})
    expect((await previous.json()) as unknown).toMatchObject({
      result: { deckId, slideIndex: 1 },
    })
  })

  it('rejects invalid views and slide indexes with structured errors', async () => {
    const invalid = await rpc('slides.ui.navigate', { view: 'speaker-notes' })
    expect(invalid.status).toBe(400)
    expect(
      ((await invalid.json()) as { error: { code: string } }).error.code,
    ).toBe('invalid_params')

    const missing = await rpc('slides.present.goto', { slideIndex: 99 })
    expect(missing.status).toBe(404)
  })
})
