import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let app: (typeof import('./app'))['app']

const workspaceHeaders = {
  'Content-Type': 'application/json',
  'x-moldable-workspace': 'drive-contract-test',
}

async function rpc(method: string, params: unknown = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: workspaceHeaders,
    body: JSON.stringify({ method, params }),
  })
}

describe('Guitar drive contract', () => {
  let temporaryHome = ''
  let previousHome: string | undefined
  let previousAppId: string | undefined

  beforeAll(async () => {
    temporaryHome = await mkdtemp(join(tmpdir(), 'guitar-drive-test-'))
    previousHome = process.env.MOLDABLE_HOME
    previousAppId = process.env.MOLDABLE_APP_ID
    process.env.MOLDABLE_HOME = temporaryHome
    process.env.MOLDABLE_APP_ID = 'guitar'
    app = (await import('./app')).app
  })

  afterAll(async () => {
    if (previousHome === undefined) delete process.env.MOLDABLE_HOME
    else process.env.MOLDABLE_HOME = previousHome
    if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
    else process.env.MOLDABLE_APP_ID = previousAppId
    await rm(temporaryHome, { recursive: true })
  })

  it('updates NativeUI lesson completion in throwaway workspace storage', async () => {
    const courses = await rpc('guitar.native.read', { route: 'courses' })
    const coursesBody = (await courses.json()) as {
      result: { courses: Array<{ id: string }> }
    }
    const courseId = coursesBody.result.courses[0]?.id
    expect(courseId).toBeTruthy()

    const course = await rpc('guitar.native.read', {
      route: 'course',
      courseId,
    })
    const courseBody = (await course.json()) as {
      result: { lessons: Array<{ id: string }> }
    }
    const lessonId = courseBody.result.lessons[0]?.id
    expect(lessonId).toBeTruthy()

    const completed = await rpc('guitar.native.mutate', {
      action: 'set-lesson-completed',
      courseId,
      lessonId,
      completed: true,
    })
    expect(await completed.json()).toMatchObject({
      ok: true,
      result: { courseId, lessonId, completed: true },
    })

    const lesson = await rpc('guitar.native.read', {
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

    await rpc('guitar.native.mutate', {
      action: 'set-lesson-completed',
      courseId,
      lessonId,
      completed: false,
    })
  })

  it('describes views and rejects invalid navigation with Zod', async () => {
    const describeResponse = await rpc('guitar.ui.describe')
    expect(describeResponse.status).toBe(200)
    const described = (await describeResponse.json()) as {
      result: { views: Array<{ id: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toContain('practice')

    const invalidResponse = await rpc('guitar.ui.navigate', {
      view: 'tablature',
    })
    expect(invalidResponse.status).toBe(400)
    expect(await invalidResponse.json()).toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    })
  })

  it('opens a real song through the single-slot intent and acknowledges it', async () => {
    const listResponse = await rpc('guitar.songs.list')
    const listed = (await listResponse.json()) as {
      result: Array<{ id: string }>
    }
    const songId = listed.result[0]?.id
    expect(songId).toBeTruthy()

    const openResponse = await rpc('guitar.ui.openSong', { songId })
    expect(openResponse.status).toBe(200)
    const opened = (await openResponse.json()) as {
      result: { intentId: string }
    }

    const intentResponse = await app.request('/api/moldable/ui-intent', {
      headers: workspaceHeaders,
    })
    expect(await intentResponse.json()).toMatchObject({
      id: opened.result.intentId,
      view: 'practice',
      entityId: songId,
    })

    const deleteResponse = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(opened.result.intentId)}`,
      { method: 'DELETE', headers: workspaceHeaders },
    )
    expect(await deleteResponse.json()).toEqual({ ok: true, deleted: true })
  })

  it('reads complete practice data and creates a practice-mode intent', async () => {
    const listResponse = await rpc('guitar.songs.list')
    const listed = (await listResponse.json()) as {
      result: Array<{ id: string }>
    }
    const songId = listed.result[0]?.id

    const readResponse = await rpc('guitar.ui.read', {
      view: 'practice',
      entityId: songId,
    })
    expect(readResponse.status).toBe(200)
    const read = (await readResponse.json()) as {
      result: {
        song: { id: string; notes: unknown[] }
        practiceSettings: unknown
      }
    }
    expect(read.result.song.id).toBe(songId)
    expect(Array.isArray(read.result.song.notes)).toBe(true)

    const practiceResponse = await rpc('guitar.ui.practiceMode', { songId })
    expect(practiceResponse.status).toBe(200)
    const intentResponse = await app.request('/api/moldable/ui-intent', {
      headers: workspaceHeaders,
    })
    expect(await intentResponse.json()).toMatchObject({
      view: 'practice',
      entityId: songId,
      params: { mode: 'practice' },
    })
  })
})
