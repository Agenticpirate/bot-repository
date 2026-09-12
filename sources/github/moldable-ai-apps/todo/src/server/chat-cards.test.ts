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
  process.env.MOLDABLE_APP_ID = 'todo'
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
describe('todo chat cards', () => {
  it('binds card reads to selected records and handles unavailable records', async () => {
    const item = (await rpc('todo.create', { title: 'Card todo' })).result
    const presented = (
      await rpc('todo.cards.present', { ids: [item.id, 'removed'] })
    ).result.appCard
    const read = (await rpc(presented.readMethod, presented.input)).result
    expect(read.items.map((todo: { id: string }) => todo.id)).toEqual([item.id])
    expect(read.missingCount).toBe(1)
    expect(
      (await rpc(presented.readMethod, presented.input, 'other')).result.items,
    ).toEqual([])
    expect(
      (await rpc('todo.cards.present', { ids: Array(13).fill(item.id) })).ok,
    ).toBe(false)
  })
})
