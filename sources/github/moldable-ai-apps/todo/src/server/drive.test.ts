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
  moldableHome = await mkdtemp(path.join(tmpdir(), 'todo-drive-'))
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'todo'
  app = (await import('./app')).app
})

afterAll(async () => {
  await rm(moldableHome, { recursive: true, force: true })
})

describe('Todo drive contract', () => {
  it('describes, navigates, reads, shows, and acknowledges intents', async () => {
    const described = (await (await rpc('todo.ui.describe')).json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'all',
      'active',
      'completed',
    ])
    expect(
      described.result.views.every((view) => view.description.length > 20),
    ).toBe(true)

    const todo = (await (
      await rpc('todo.create', { title: 'Prove Todo drive' })
    ).json()) as { result: { id: string } }
    const navigation = (await (
      await rpc('todo.ui.navigate', {
        view: 'active',
        entityId: todo.result.id,
      })
    ).json()) as { result: { intentId: string } }
    const intentResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await intentResponse.json()).toMatchObject({
      id: navigation.result.intentId,
      view: 'active',
      entityId: todo.result.id,
    })

    const read = (await (
      await rpc('todo.ui.read', { view: 'active' })
    ).json()) as {
      result: {
        summary: { activeLabel: string }
        todos: Array<{
          id: string
          completedLabel: string
          dueDateLabel: string
          canComplete: boolean
          stateActionLabel: string
          stateActionIcon: string
          titleExcerpt: string
        }>
      }
    }
    expect(read.result.todos.map((item) => item.id)).toContain(todo.result.id)
    expect(read.result.summary.activeLabel).toBe('1')
    expect(read.result.todos[0]).toMatchObject({
      completedLabel: 'No',
      dueDateLabel: 'No due date',
      canComplete: true,
      stateActionLabel: 'Complete',
      stateActionIcon: 'checkmark.circle',
      titleExcerpt: 'Prove Todo drive',
    })

    const nativeRead = (await (
      await rpc('todo.native.read', { view: 'active', limit: 1 })
    ).json()) as {
      result: { todos: Array<{ id: string }>; truncationNotice: string }
    }
    expect(nativeRead.result.todos).toHaveLength(1)
    expect(nativeRead.result.todos[0]?.id).toBe(todo.result.id)
    expect(nativeRead.result.truncationNotice).toBe('')

    const createDraft = (await (
      await rpc('todo.native.draft', { mode: 'create' })
    ).json()) as {
      result: { draft: { title: string; priority: string; dueDate: string } }
    }
    expect(createDraft.result.draft).toEqual({
      title: '',
      priority: 'medium',
      dueDate: '',
    })

    const dueDate = '2026-08-04T18:30:00.000Z'
    await rpc('todo.update', { id: todo.result.id, dueDate })
    const editDraft = (await (
      await rpc('todo.native.draft', { mode: 'edit', id: todo.result.id })
    ).json()) as {
      result: { id: string; draft: { dueDate: string } }
    }
    expect(editDraft.result).toMatchObject({
      id: todo.result.id,
      draft: { dueDate },
    })

    const before = (await (
      await rpc('todo.get', { id: todo.result.id })
    ).json()) as {
      result: { statusActions: Array<{ label: string; completed: boolean }> }
    }
    expect(before.result.statusActions).toEqual([
      expect.objectContaining({ label: 'Mark complete', completed: true }),
    ])
    await rpc('todo.complete', { id: todo.result.id, completed: true })
    const after = (await (
      await rpc('todo.get', { id: todo.result.id })
    ).json()) as {
      result: {
        completedLabel: string
        statusActions: Array<{ label: string }>
      }
    }
    expect(after.result.completedLabel).toBe('Yes')
    expect(after.result.statusActions[0]?.label).toBe('Reopen')

    const shown = await rpc('todo.ui.show')
    expect(shown.status).toBe(200)
    const showIntent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string }
    expect(showIntent.view).toBe('all')
    expect(
      await (
        await app.request(`/api/moldable/ui-intent?id=${showIntent.id}`, {
          method: 'DELETE',
          headers: HEADERS,
        })
      ).json(),
    ).toEqual({ ok: true, deleted: true })

    expect((await rpc('todo.ui.navigate', { view: 'missing' })).status).toBe(
      400,
    )
  })
})
