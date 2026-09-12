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
  process.env.MOLDABLE_APP_ID = 'guitar'
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
describe('guitar chat cards', () => {
  it('keeps hydration bounded and bound to its authoritative record', async () => {
    const listed = await rpc('guitar.songs.list', {})
    const songs = listed.result
    const card = (await rpc('guitar.cards.present', { songId: songs[0].id }))
      .result.appCard
    expect(card.input).toEqual({ songId: songs[0].id })
    const preview = (await rpc(card.readMethod, card.input)).result
    expect(preview.notes.length).toBeLessThanOrEqual(12)
    expect(preview).not.toHaveProperty('tutorial')
    const detail = (await rpc(card.readMethod, { ...card.input, detail: true }))
      .result
    expect(detail.notes.length).toBeLessThanOrEqual(1000)
    expect(
      detail.notes.every(
        (note: { start: number; duration: number }) =>
          note.start + note.duration <= 30,
      ),
    ).toBe(true)
    expect(
      (await rpc('guitar.cards.present', { songId: '../outside' })).ok,
    ).toBe(false)
  })
})
