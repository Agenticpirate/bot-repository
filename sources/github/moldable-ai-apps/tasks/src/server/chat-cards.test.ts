import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let temporaryHome = ''
beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'chat-cards-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'tasks'
  delete process.env.MOLDABLE_APP_DATA_DIR
  delete process.env.MOLDABLE_WORKSPACE_ID
})
afterAll(async () => {
  process.env = originalEnv
  await rm(temporaryHome, { recursive: true, force: true })
})
async function rpc(
  method: string,
  params: Record<string, unknown>,
  workspace = 'cards-test',
) {
  const response = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-workspace-id': workspace,
      'x-moldable-workspace': workspace,
      'x-moldable-rpc': '1',
    },
    body: JSON.stringify({ method, params }),
  })
  return response.json()
}
describe('tasks chat cards', () => {
  it('binds card reads to selected records and handles unavailable records', async () => {
    const project = (
      await rpc('tasks.projects.create', { name: 'Card proof', key: 'CARD' })
    ).result
    const task = (
      await rpc('tasks.tasks.create', {
        projectId: project.id,
        title: 'Card task',
        description: 'Complete description',
      })
    ).result
    const presented = (await rpc('tasks.cards.present', { taskId: task.id }))
      .result.appCard
    expect(presented.input).toEqual({ taskId: task.id })
    const read = (await rpc(presented.readMethod, presented.input)).result
    expect(read.description).toBe('Complete description')
    expect(
      (await rpc('tasks.cards.present', { taskId: task.id }, 'other')).ok,
    ).toBe(false)
  })
})
