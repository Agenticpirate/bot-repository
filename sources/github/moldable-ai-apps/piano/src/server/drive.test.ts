import { PIANO_PLAYBACK_LEASE_MS } from '../shared/ui-intent'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The drive contract writes real files, so point Moldable storage at a
// throwaway home before the app (and its storage helpers) are imported.
let moldableHome: string
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
  moldableHome = await mkdtemp(path.join(tmpdir(), 'piano-drive-'))
  previousHome = process.env.MOLDABLE_HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'piano'
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.MOLDABLE_HOME
  else process.env.MOLDABLE_HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(moldableHome, { recursive: true, force: true })
})

describe('piano.native.mutate', () => {
  it('updates lesson completion in throwaway workspace storage', async () => {
    const courses = await rpc('piano.native.read', { route: 'courses' })
    const coursesBody = (await courses.json()) as {
      result: { courses: Array<{ id: string }> }
    }
    const courseId = coursesBody.result.courses[0]?.id
    expect(courseId).toBeTruthy()

    const course = await rpc('piano.native.read', { route: 'course', courseId })
    const courseBody = (await course.json()) as {
      result: { lessons: Array<{ id: string }> }
    }
    const lessonId = courseBody.result.lessons[0]?.id
    expect(lessonId).toBeTruthy()

    const completed = await rpc('piano.native.mutate', {
      action: 'set-lesson-completed',
      courseId,
      lessonId,
      completed: true,
    })
    expect(await completed.json()).toMatchObject({
      ok: true,
      result: { courseId, lessonId, completed: true },
    })

    const lesson = await rpc('piano.native.read', {
      route: 'lesson',
      courseId,
      lessonId,
    })
    const lessonBody = (await lesson.json()) as {
      result: {
        tags: string[]
        completionActions: Array<{ completed: boolean }>
      }
    }
    expect(lessonBody.result.tags).toContain('Completed')
    expect(lessonBody.result.completionActions[0]?.completed).toBe(false)

    await rpc('piano.native.mutate', {
      action: 'set-lesson-completed',
      courseId,
      lessonId,
      completed: false,
    })
  })
})

describe('piano.ui.describe', () => {
  it('lists every navigable view with model-readable descriptions', async () => {
    const res = await rpc('piano.ui.describe')
    const body = (await res.json()) as {
      ok: boolean
      result: {
        views: Array<{ id: string; name: string; description: string }>
      }
    }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'library',
      'courses',
      'folder',
      'course',
      'lesson',
      'practice',
    ])
    for (const view of body.result.views) {
      expect(view.name.length).toBeGreaterThan(0)
      expect(view.description.length).toBeGreaterThan(20)
    }
  })
})

describe('piano.ui.navigate and the ui-intent slot', () => {
  it('writes a last-wins intent, exposes it on GET, and acks on DELETE', async () => {
    const navRes = await rpc('piano.ui.navigate', {
      view: 'practice',
      entityId: 'fur-elise',
    })
    const navBody = (await navRes.json()) as {
      ok: boolean
      result: { ok: boolean; intentId: string }
    }
    expect(navRes.status).toBe(200)
    expect(navBody.result.ok).toBe(true)
    expect(navBody.result.intentId.length).toBeGreaterThan(0)

    // Last-wins: a second navigate replaces the slot.
    const secondRes = await rpc('piano.ui.navigate', { view: 'courses' })
    const secondBody = (await secondRes.json()) as {
      ok: boolean
      result: { intentId: string }
    }

    const getRes = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getRes.json()) as {
      id: string
      view: string
      createdAt: string
    } | null
    expect(getRes.status).toBe(200)
    expect(intent?.id).toBe(secondBody.result.intentId)
    expect(intent?.view).toBe('courses')
    expect(intent?.createdAt).toBeTruthy()

    // Ack with the wrong id leaves the intent in place.
    const wrongDelete = await app.request(
      '/api/moldable/ui-intent?id=not-the-id',
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await wrongDelete.json()) as { deleted: boolean }).deleted).toBe(
      false,
    )

    // Ack with the right id clears it.
    const deleteRes = await app.request(
      `/api/moldable/ui-intent?id=${secondBody.result.intentId}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await deleteRes.json()) as { deleted: boolean }).deleted).toBe(
      true,
    )
    const afterRes = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await afterRes.json()).toBeNull()
  })

  it('rejects unknown views and missing entities', async () => {
    const badView = await rpc('piano.ui.navigate', { view: 'settings' })
    expect(badView.status).toBe(400)
    expect(
      ((await badView.json()) as { error: { code: string } }).error.code,
    ).toBe('invalid_params')

    const badSong = await rpc('piano.ui.navigate', {
      view: 'practice',
      entityId: 'no-such-song',
    })
    expect(badSong.status).toBe(404)
    expect(
      ((await badSong.json()) as { error: { code: string } }).error.code,
    ).toBe('song_not_found')

    const missingEntity = await rpc('piano.ui.navigate', { view: 'folder' })
    expect(missingEntity.status).toBe(400)
    expect(
      ((await missingEntity.json()) as { error: { code: string } }).error.code,
    ).toBe('entity_id_required')
  })
})

describe('piano.ui.openPiece and piano.ui.practiceMode', () => {
  it('opens a seeded piece via the intent slot', async () => {
    const res = await rpc('piano.ui.openPiece', { pieceId: 'fur-elise' })
    const body = (await res.json()) as {
      ok: boolean
      result: { intentId: string; pieceId: string }
    }
    expect(res.status).toBe(200)
    expect(body.result.pieceId).toBe('fur-elise')

    const getRes = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getRes.json()) as {
      id: string
      view: string
      entityId?: string
    } | null
    expect(intent?.view).toBe('practice')
    expect(intent?.entityId).toBe('fur-elise')
    await app.request(`/api/moldable/ui-intent?id=${intent?.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })
  })

  it('starts practice mode with optional hand isolation', async () => {
    const res = await rpc('piano.ui.practiceMode', {
      pieceId: 'fur-elise',
      part: 'bass',
    })
    const body = (await res.json()) as {
      ok: boolean
      result: { intentId: string; part: string }
    }
    expect(res.status).toBe(200)
    expect(body.result.part).toBe('bass')

    const getRes = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getRes.json()) as {
      id: string
      view: string
      entityId?: string
      params?: { mode?: string; part?: string }
    } | null
    expect(intent?.view).toBe('practice')
    expect(intent?.params?.mode).toBe('practice')
    expect(intent?.params?.part).toBe('bass')
    await app.request(`/api/moldable/ui-intent?id=${intent?.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })

    const badPart = await rpc('piano.ui.practiceMode', {
      pieceId: 'fur-elise',
      part: 'left-hand',
    })
    expect(badPart.status).toBe(400)
  })
})

describe('piano.ui.playPiece', () => {
  it('resolves a human title and persists one folder-aware play outcome', async () => {
    const res = await rpc('piano.ui.playPiece', {
      piece: 'Für Elise',
      part: 'all',
    })
    const body = (await res.json()) as {
      ok: boolean
      result: {
        intentId: string
        pieceId: string
        title: string
        folderId: string | null
        status: string
      }
    }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.pieceId).toBe('fur-elise')
    expect(body.result.title).toBe('Fur Elise')
    expect(body.result.folderId).toBeTruthy()
    expect(body.result.status).toBe('queued')

    const intentRes = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await intentRes.json()) as {
      id: string
      view: string
      entityId?: string
      params?: { mode?: string; folderId?: string }
      playback?: { type: string; status: string }
    }
    expect(intent.id).toBe(body.result.intentId)
    expect(intent.view).toBe('practice')
    expect(intent.entityId).toBe('fur-elise')
    expect(intent.params?.mode).toBe('play')
    expect(intent.params?.folderId).toBe(body.result.folderId)
    expect(intent.playback).toMatchObject({ type: 'play', status: 'queued' })
  })

  it('allows exactly one client to claim playback and reports autoplay status', async () => {
    const playRes = await rpc('piano.ui.playPiece', { piece: 'fur-elise' })
    const playBody = (await playRes.json()) as {
      result: { intentId: string }
    }
    const intentId = playBody.result.intentId

    const consumerId = 'renderer-a'
    const claim = () =>
      app.request(`/api/moldable/ui-intent/${intentId}/claim-playback`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId }),
      })
    const claimResponses = await Promise.all([claim(), claim()])
    const claimBodies = (await Promise.all(
      claimResponses.map((response) => response.json()),
    )) as Array<{
      claimed: boolean
      intent: { playback?: { status: string; attemptId?: string } }
    }>

    expect(claimBodies.map((body) => body.claimed).sort()).toEqual([
      false,
      true,
    ])
    const winner = claimBodies.find((body) => body.claimed)
    expect(winner?.intent.playback?.status).toBe('preparing')
    const attemptId = winner?.intent.playback?.attemptId
    expect(attemptId).toBeTruthy()

    const blockedRes = await app.request(
      `/api/moldable/ui-intent/${intentId}/playback`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          consumerId,
          status: 'interaction-required',
          message: 'Press Play once to allow audio.',
        }),
      },
    )
    expect(blockedRes.status).toBe(200)

    const blockedStatusRes = await rpc('piano.ui.playbackStatus', { intentId })
    const blockedStatus = (await blockedStatusRes.json()) as {
      result: { pieceId: string; status: string; message: string }
    }
    expect(blockedStatus.result).toMatchObject({
      pieceId: 'fur-elise',
      status: 'interaction-required',
      message: 'Press Play once to allow audio.',
    })

    // The same claimed attempt may complete after the user grants audio with
    // one Play press, but no other client can claim or replay it.
    const playingRes = await app.request(
      `/api/moldable/ui-intent/${intentId}/playback`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, consumerId, status: 'playing' }),
      },
    )
    expect(playingRes.status).toBe(200)

    const duplicateClaim = await claim()
    const duplicateBody = (await duplicateClaim.json()) as {
      claimed: boolean
      intent: { playback?: { status: string } }
    }
    expect(duplicateBody.claimed).toBe(false)
    expect(duplicateBody.intent.playback?.status).toBe('playing')

    const completedRes = await app.request(
      `/api/moldable/ui-intent/${intentId}/playback`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          consumerId,
          status: 'completed',
        }),
      },
    )
    expect(completedRes.status).toBe(200)
    const completedClaim = await claim()
    const completedBody = (await completedClaim.json()) as {
      claimed: boolean
      intent: { playback?: { status: string } }
    }
    expect(completedBody.claimed).toBe(false)
    expect(completedBody.intent.playback?.status).toBe('completed')
  })

  it('requeues on renderer exit and transfers to exactly one replacement', async () => {
    const playRes = await rpc('piano.ui.playPiece', { piece: 'fur-elise' })
    const playBody = (await playRes.json()) as {
      result: { intentId: string }
    }
    const intentId = playBody.result.intentId

    const claimFor = (consumerId: string) =>
      app.request(`/api/moldable/ui-intent/${intentId}/claim-playback`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId }),
      })

    const firstClaim = (await (await claimFor('embedded-renderer')).json()) as {
      claimed: boolean
      intent: {
        playback?: {
          attemptId?: string
          consumerId?: string
          status: string
        }
      }
    }
    expect(firstClaim.claimed).toBe(true)
    const firstAttemptId = firstClaim.intent.playback?.attemptId
    expect(firstAttemptId).toBeTruthy()

    const playingRes = await app.request(
      `/api/moldable/ui-intent/${intentId}/playback`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: firstAttemptId,
          consumerId: 'embedded-renderer',
          status: 'playing',
        }),
      },
    )
    expect(playingRes.status).toBe(200)

    // Renderer A stops Web Audio before this unload release. The durable
    // intent becomes claimable only after its exact ownership CAS succeeds.
    const releaseRes = await app.request(
      `/api/moldable/ui-intent/${intentId}/release-playback`,
      {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: firstAttemptId,
          consumerId: 'embedded-renderer',
        }),
      },
    )
    expect(releaseRes.status).toBe(200)
    expect(
      (
        (await releaseRes.json()) as {
          intent: { playback?: { status: string; attemptId?: string } }
        }
      ).intent.playback,
    ).toMatchObject({ status: 'queued' })

    const replacementClaims = await Promise.all([
      claimFor('dedicated-renderer'),
      claimFor('duplicate-renderer'),
    ])
    const replacementBodies = (await Promise.all(
      replacementClaims.map((response) => response.json()),
    )) as Array<{
      claimed: boolean
      intent: {
        playback?: { attemptId?: string; consumerId?: string; status: string }
      }
    }>
    expect(replacementBodies.map((body) => body.claimed).sort()).toEqual([
      false,
      true,
    ])
    const replacement = replacementBodies.find((body) => body.claimed)
    expect(replacement?.intent.playback?.status).toBe('preparing')
    expect(['dedicated-renderer', 'duplicate-renderer']).toContain(
      replacement?.intent.playback?.consumerId,
    )
    expect(replacement?.intent.playback?.attemptId).not.toBe(firstAttemptId)

    // A late unload from the old renderer cannot requeue the new owner.
    const staleRelease = await app.request(
      `/api/moldable/ui-intent/${intentId}/release-playback`,
      {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: firstAttemptId,
          consumerId: 'embedded-renderer',
        }),
      },
    )
    expect(staleRelease.status).toBe(409)
  })

  it('recovers an abandoned claim after its bounded lease expires', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'))
      const playRes = await rpc('piano.ui.playPiece', {
        piece: 'fur-elise',
      })
      const playBody = (await playRes.json()) as {
        result: { intentId: string }
      }
      const intentId = playBody.result.intentId
      const claim = async (consumerId: string) =>
        (await (
          await app.request(
            `/api/moldable/ui-intent/${intentId}/claim-playback`,
            {
              method: 'POST',
              headers: { ...HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({ consumerId }),
            },
          )
        ).json()) as {
          claimed: boolean
          intent: {
            playback?: {
              attemptId?: string
              consumerId?: string
              leaseExpiresAt?: string
              status: string
            }
          }
        }

      const abandoned = await claim('renderer-a')
      expect(abandoned.claimed).toBe(true)
      const abandonedAttemptId = abandoned.intent.playback?.attemptId
      expect(abandonedAttemptId).toBeTruthy()
      const intentPath = path.join(
        moldableHome,
        'workspaces',
        WORKSPACE,
        'apps',
        'piano',
        'data',
        'ui-intent.json',
      )
      const persistedBeforeHeartbeat = await readFile(intentPath, 'utf8')

      vi.setSystemTime(new Date(Date.now() + PIANO_PLAYBACK_LEASE_MS - 1_000))
      const heartbeatRes = await app.request(
        `/api/moldable/ui-intent/${intentId}/playback-heartbeat`,
        {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: abandonedAttemptId,
            consumerId: 'renderer-a',
          }),
        },
      )
      expect(heartbeatRes.status).toBe(200)
      expect(await readFile(intentPath, 'utf8')).toBe(persistedBeforeHeartbeat)

      // The original deadline has passed, but A's heartbeat keeps B from
      // acquiring a concurrent playback lease.
      vi.setSystemTime(new Date(Date.now() + 1_001))
      const blocked = await claim('renderer-b')
      expect(blocked.claimed).toBe(false)
      expect(blocked.intent.playback?.consumerId).toBe('renderer-a')

      vi.setSystemTime(new Date(Date.now() + PIANO_PLAYBACK_LEASE_MS + 1))
      const recovered = await claim('renderer-b')
      expect(recovered.claimed).toBe(true)
      expect(recovered.intent.playback).toMatchObject({
        consumerId: 'renderer-b',
        status: 'preparing',
      })
      expect(recovered.intent.playback?.attemptId).not.toBe(abandonedAttemptId)

      const staleCompletion = await app.request(
        `/api/moldable/ui-intent/${intentId}/playback`,
        {
          method: 'PATCH',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: abandonedAttemptId,
            consumerId: 'renderer-a',
            status: 'playing',
          }),
        },
      )
      expect(staleCompletion.status).toBe(409)
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns a structured error for an unknown title', async () => {
    const res = await rpc('piano.ui.playPiece', {
      piece: 'A Piece That Is Not Installed',
    })
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'song_not_found',
    )
  })
})

describe('piano.ui.read', () => {
  it('summarizes the library as clean speakable text by default', async () => {
    const res = await rpc('piano.ui.read')
    const body = (await res.json()) as { ok: boolean; result: { text: string } }
    expect(res.status).toBe(200)
    expect(body.result.text).toMatch(/piano library has \d+ songs/)
    expect(body.result.text).not.toMatch(/[*#`<>]/)
  })

  it('reads a piece with metadata and practice state', async () => {
    const res = await rpc('piano.ui.read', {
      view: 'practice',
      entityId: 'fur-elise',
    })
    const body = (await res.json()) as { ok: boolean; result: { text: string } }
    expect(res.status).toBe(200)
    expect(body.result.text).toContain('Fur Elise')
    expect(body.result.text).toMatch(/beats per minute/)
    expect(body.result.text).toMatch(/playback speed/i)
    expect(body.result.text).not.toMatch(/[*#`<>]/)
  })

  it('requires an entityId for entity views', async () => {
    const res = await rpc('piano.ui.read', { view: 'practice' })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'entity_id_required',
    )
  })
})
