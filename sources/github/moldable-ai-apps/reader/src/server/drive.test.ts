import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let moldableHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'reader-drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'reader-drive-'))
  previousHome = process.env.MOLDABLE_HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'reader'
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.MOLDABLE_HOME
  else process.env.MOLDABLE_HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(moldableHome, { recursive: true, force: true })
})

describe('reader drive contract', () => {
  it('describes model-readable views', async () => {
    const response = await rpc('reader.ui.describe')
    const body = (await response.json()) as {
      ok: boolean
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'library',
      'reader',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 30),
    ).toBe(true)
  })

  it('validates navigation and exposes a replayable last-wins desired state', async () => {
    const first = await rpc('reader.ui.navigate', { view: 'library' })
    expect(first.status).toBe(200)

    const second = await rpc('reader.ui.navigate', {
      view: 'reader',
      entityId: 'aesops-fables',
      params: { chapterIndex: 1 },
    })
    const secondBody = (await second.json()) as {
      result: { intentId: string }
    }
    expect(second.status).toBe(200)

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as {
      id: string
      view: string
      entityId?: string
      params?: { chapterIndex?: number }
    }
    expect(intent.id).toBe(secondBody.result.intentId)
    expect(intent.view).toBe('reader')
    expect(intent.entityId).toBe('aesops-fables')
    expect(intent.params?.chapterIndex).toBe(1)

    const wrongAck = await app.request(
      '/api/moldable/ui-intent?id=not-current',
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await wrongAck.json()) as { deleted: boolean }).deleted).toBe(
      false,
    )

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await ack.json()) as { deleted: boolean }).deleted).toBe(true)
    const after = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await after.json()).toMatchObject({
      id: intent.id,
      view: 'reader',
      entityId: 'aesops-fables',
    })

    const invalid = await rpc('reader.ui.navigate', { view: 'settings' })
    expect(invalid.status).toBe(400)
    expect(
      ((await invalid.json()) as { error: { code: string } }).error.code,
    ).toBe('invalid_params')
  })

  it('opens books and persists chapter navigation', async () => {
    const open = await rpc('reader.ui.openBook', {
      bookId: 'aesops-fables',
    })
    expect(open.status).toBe(200)

    const goTo = await rpc('reader.ui.goToChapter', {
      bookId: 'aesops-fables',
      chapter: 2,
    })
    const body = (await goTo.json()) as {
      result: { chapter: number; intentId: string }
    }
    expect(goTo.status).toBe(200)
    expect(body.result.chapter).toBe(2)
    expect(body.result.intentId).toBeTruthy()

    const missing = await rpc('reader.ui.openBook', {
      bookId: 'missing-book',
    })
    expect(missing.status).toBe(404)
  })

  it('returns the current chapter as complete clean text', async () => {
    const response = await rpc('reader.ui.read', {
      view: 'reader',
      entityId: 'aesops-fables',
    })
    const body = (await response.json()) as {
      ok: boolean
      result: {
        position: { chapterIndex: number }
        chapter: { title: string; text: string }
      }
    }
    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.position.chapterIndex).toBe(2)
    expect(body.result.chapter.title).toBe('The Lion and the Mouse')
    expect(body.result.chapter.text).toContain('Once when a Lion was asleep')
    expect(body.result.chapter.text).not.toMatch(/<[^>]+>/)
  })

  it('resumes a natural book reference with one bounded passage', async () => {
    const response = await rpc('reader.reading.resume', {
      book: 'three tales',
      maxWords: 40,
    })
    const body = (await response.json()) as {
      ok: boolean
      result: {
        book: { id: string; title: string }
        position: { chapterIndex: number; wordIndex: number }
        passage: {
          id: string
          text: string
          wordCount: number
          cursor: { chapterIndex: number; wordIndex: number }
          nextCursor: { chapterIndex: number; wordIndex: number } | null
        }
        completed: boolean
        intentId: string
      }
    }

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.book).toMatchObject({
      id: 'poe-tales',
      title: 'Three Tales and a Poem',
    })
    expect(body.result.position).toMatchObject({
      chapterIndex: 0,
      wordIndex: 0,
    })
    expect(body.result.passage.wordCount).toBeGreaterThanOrEqual(20)
    expect(body.result.passage.wordCount).toBeLessThanOrEqual(40)
    expect(body.result.passage.text).toContain('nervous')
    expect(body.result.completed).toBe(false)
    expect(body.result.intentId).toBeTruthy()
  })

  it('replays desired navigation across old-frame transfer and crash reloads', async () => {
    const resumed = await rpc('reader.reading.resume', {
      book: 'Aesops Fables',
    })
    expect(resumed.status).toBe(200)
    const resumeBody = (await resumed.json()) as {
      result: { intentId: string }
    }

    const consume = async () => {
      const response = await app.request('/api/moldable/ui-intent/consume', {
        method: 'POST',
        headers: HEADERS,
      })
      return response.json()
    }

    const oldFrameIntent = (await consume()) as {
      id: string
      view: string
      entityId?: string
    }
    expect(oldFrameIntent).toMatchObject({
      id: resumeBody.result.intentId,
      view: 'reader',
      entityId: 'aesops-fables',
    })

    // The old embedded frame can disappear immediately after reading the
    // intent, before it applies or acknowledges anything.
    expect(await consume()).toMatchObject(oldFrameIntent)

    const oldFrameAck = await app.request('/api/moldable/ui-intent/ack', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId: oldFrameIntent.id }),
    })
    expect(
      ((await oldFrameAck.json()) as { acknowledged: boolean }).acknowledged,
    ).toBe(true)

    // The dedicated replacement mounts after the old embedded frame applied
    // and acknowledged the intent. It must still receive the same desired UI.
    const transferredIntent = (await consume()) as {
      id: string
      acknowledgedAt?: string
    }
    expect(transferredIntent).toMatchObject(oldFrameIntent)
    expect(transferredIntent.acknowledgedAt).toEqual(expect.any(String))

    // Simulate that replacement crashing, then reloading.
    expect(await consume()).toMatchObject(oldFrameIntent)

    const reloadAck = await app.request('/api/moldable/ui-intent/ack', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId: oldFrameIntent.id }),
    })
    expect(
      ((await reloadAck.json()) as { acknowledged: boolean }).acknowledged,
    ).toBe(true)

    // ACK is idempotent metadata; desired state remains replayable for any
    // subsequent renderer recreation until a newer navigation supersedes it.
    expect(await consume()).toMatchObject({
      ...oldFrameIntent,
      acknowledgedAt: transferredIntent.acknowledgedAt,
    })
  })

  it('advances only after acknowledgement and makes retries idempotent', async () => {
    const resumed = await rpc('reader.reading.resume', {
      book: 'poe tales',
      maxWords: 35,
    })
    const resumeBody = (await resumed.json()) as {
      result: {
        passage: {
          id: string
          nextCursor: {
            bookId: string
            chapterIndex: number
            wordIndex: number
          }
        }
      }
    }
    const firstPassage = resumeBody.result.passage

    const before = await app.request('/api/books/poe-tales', {
      headers: HEADERS,
    })
    const beforeBody = (await before.json()) as {
      progress: { chapterIndex: number; wordIndex: number }
    }
    expect(beforeBody.progress).toMatchObject({
      chapterIndex: 0,
      wordIndex: 0,
    })

    const advance = await rpc('reader.reading.advance', {
      passageId: firstPassage.id,
    })
    const advanceBody = (await advance.json()) as {
      replayed: boolean
      result: {
        position: { chapterIndex: number; wordIndex: number }
        passage: { id: string } | null
      }
    }
    expect(advance.status).toBe(200)
    expect(advanceBody.replayed).toBe(false)
    expect(advanceBody.result.position).toEqual(firstPassage.nextCursor)

    const retry = await rpc('reader.reading.advance', {
      passageId: firstPassage.id,
    })
    const retryBody = (await retry.json()) as typeof advanceBody
    expect(retry.status).toBe(200)
    expect(retryBody.replayed).toBe(true)
    expect(retryBody.result).toEqual(advanceBody.result)

    const after = await app.request('/api/books/poe-tales', {
      headers: HEADERS,
    })
    const afterBody = (await after.json()) as {
      progress: { chapterIndex: number; wordIndex: number }
    }
    expect(afterBody.progress).toMatchObject(firstPassage.nextCursor)

    const resumedAgain = await rpc('reader.reading.resume', {
      book: 'Three Tales and a Poem',
      maxWords: 35,
    })
    const resumedAgainBody = (await resumedAgain.json()) as {
      result: { passage: { id: string } | null }
    }
    expect(resumedAgainBody.result.passage?.id).toBe(
      advanceBody.result.passage?.id,
    )

    await app.request('/api/books/poe-tales/progress', {
      method: 'PUT',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterIndex: 0,
        blockIndex: 0,
        wordIndex: 0,
        percent: 0,
      }),
    })
    const reread = await rpc('reader.reading.currentPassage', {
      bookId: 'poe-tales',
      maxWords: 35,
    })
    const rereadBody = (await reread.json()) as {
      result: { passage: { id: string } }
    }
    expect(rereadBody.result.passage.id).not.toBe(firstPassage.id)
  })

  it('returns a structured error for an unknown natural title', async () => {
    const response = await rpc('reader.reading.resume', {
      book: 'A Book That Is Not Installed',
    })
    expect(response.status).toBe(404)
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe('book_not_found')
  })
})
