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
  process.env.MOLDABLE_APP_ID = 'scribo'
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
describe('scribo chat cards', () => {
  it('binds hydration to saved data and never changes the source', async () => {
    const entry = (
      await rpc('scribo.entries.create', {
        title: 'Practice',
        content: 'Hello',
        translation: 'Bonjour',
        sourceLanguage: 'en',
        targetLanguage: 'fr',
      })
    ).result
    const card = (await rpc('scribo.cards.present', { id: entry.id })).result
      .appCard
    expect(card.input).toEqual({ id: entry.id })
    expect((await rpc(card.readMethod, card.input)).result.translation).toBe(
      'Bonjour',
    )
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect((await rpc('scribo.entries.get', { id: entry.id })).result).toEqual(
      entry,
    )
  })
})
