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
  process.env.MOLDABLE_APP_ID = 'notes'
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
describe('notes chat cards', () => {
  it('binds card reads to selected records and handles unavailable records', async () => {
    const note = (
      await rpc('notes.create', { title: 'My note', content: 'Full document' })
    ).result
    const presented = (await rpc('notes.cards.present', { id: note.id })).result
      .appCard
    expect(presented.input).toEqual({ id: note.id })
    expect(presented).not.toHaveProperty('content')
    expect(
      (await rpc(presented.readMethod, presented.input)).result.content,
    ).toBe('Full document')
    expect(
      (await rpc('notes.cards.present', { id: note.id }, 'other')).ok,
    ).toBe(false)
  })
})
