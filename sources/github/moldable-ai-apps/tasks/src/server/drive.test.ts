import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let moldableHome: string
let app: (typeof import('./app'))['app']

const HEADERS = { 'x-moldable-workspace': 'drive-test' }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'tasks-drive-'))
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'tasks'
  app = (await import('./app')).app
})

afterAll(async () => {
  await rm(moldableHome, { recursive: true, force: true })
})

describe('Tasks drive contract', () => {
  it('describes views, validates navigation, and exposes a last-wins slot', async () => {
    const describeResponse = await rpc('tasks.ui.describe')
    const described = (await describeResponse.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'projects',
      'project',
      'task',
    ])
    expect(
      described.result.views.every((view) => view.description.length > 20),
    ).toBe(true)

    expect((await rpc('tasks.ui.navigate', { view: 'unknown' })).status).toBe(
      400,
    )
    expect((await rpc('tasks.ui.navigate', { view: 'project' })).status).toBe(
      404,
    )

    const navigateResponse = await rpc('tasks.ui.navigate', {
      view: 'projects',
    })
    const navigate = (await navigateResponse.json()) as {
      result: { intentId: string }
    }
    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as { id: string; view: string }
    expect(intent).toMatchObject({
      id: navigate.result.intentId,
      view: 'projects',
    })

    const deleteResponse = await app.request(
      `/api/moldable/ui-intent?id=${intent.id}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(await deleteResponse.json()).toEqual({ ok: true, deleted: true })
    expect(
      await (
        await app.request('/api/moldable/ui-intent', { headers: HEADERS })
      ).json(),
    ).toBeNull()
  })

  it('shows a real list, reads open task JSON, and completes a task', async () => {
    const project = (
      (await (
        await rpc('tasks.projects.create', { name: 'Drive proof', key: 'DRV' })
      ).json()) as { result: { id: string } }
    ).result
    const task = (
      (await (
        await rpc('tasks.tasks.create', {
          projectId: project.id,
          title: 'Finish drive contract',
        })
      ).json()) as { result: { id: string } }
    ).result

    expect(
      (await rpc('tasks.ui.showList', { listId: project.id })).status,
    ).toBe(200)
    const read = (await (
      await rpc('tasks.ui.read', { view: 'project', entityId: project.id })
    ).json()) as {
      result: { summary: { openTasks: Array<{ id: string }> } }
    }
    expect(read.result.summary.openTasks.map((item) => item.id)).toContain(
      task.id,
    )

    const nativeProjects = (await (
      await rpc('tasks.native.read', { route: 'projects' })
    ).json()) as {
      result: {
        projects: Array<{ id: string; leadingIcon: string }>
        summary: {
          projects: Array<{ id: string; leadingIcon: string }>
        }
      }
    }
    expect(nativeProjects.result.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: project.id, leadingIcon: 'tray.full' }),
      ]),
    )
    expect(nativeProjects.result.summary.projects).toEqual(
      nativeProjects.result.projects,
    )

    const nativeSearch = (await (
      await rpc('tasks.native.read', {
        route: 'search',
        query: 'drive contract',
      })
    ).json()) as {
      result: { tasks: Array<{ id: string; projectName: string }> }
    }
    expect(nativeSearch.result.tasks).toEqual([
      expect.objectContaining({ id: task.id, projectName: 'Drive proof' }),
    ])

    const nativeBefore = (await (
      await rpc('tasks.native.read', { route: 'task', taskId: task.id })
    ).json()) as {
      result: {
        statusLabel: string
        priorityLabel: string
        statusActions: Array<{ label: string }>
      }
    }
    expect(nativeBefore.result).toMatchObject({
      statusLabel: 'Open',
      priorityLabel: 'None',
      statusActions: [{ label: 'Mark complete' }],
    })

    const completed = (await (
      await rpc('tasks.tasks.complete', { taskId: task.id })
    ).json()) as { result: { status: string; completedAt: string } }
    expect(completed.result.status).toBe('completed')
    expect(completed.result.completedAt).toBeTruthy()

    const nativeAfter = (await (
      await rpc('tasks.native.read', { route: 'task', taskId: task.id })
    ).json()) as { result: { statusLabel: string; statusActions: unknown[] } }
    expect(nativeAfter.result).toMatchObject({
      statusLabel: 'Completed',
      statusActions: [],
    })
  })
})
