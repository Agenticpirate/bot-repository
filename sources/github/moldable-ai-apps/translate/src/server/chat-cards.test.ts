import { ensureDir, getAppDataDir, writeJson } from '@moldable-ai/storage'
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
  process.env.MOLDABLE_APP_ID = 'translate'
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
describe('translate chat cards', () => {
  it('binds hydration to saved data and never changes the source', async () => {
    const dataDir = getAppDataDir('cards-test')
    await ensureDir(dataDir)
    const history = [
      {
        id: 'saved',
        sourceText: 'Hello',
        translatedText: 'Bonjour',
        requestedSource: 'en',
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        createdAt: '2026-09-10T12:00:00.000Z',
      },
    ]
    await writeJson(join(dataDir, 'history.json'), history)
    const card = (await rpc('translate.cards.present', { id: 'saved' })).result
      .appCard
    expect(card.input).toEqual({ id: 'saved' })
    expect((await rpc(card.readMethod, card.input)).result.translation).toBe(
      'Bonjour',
    )
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect((await rpc('translate.history.list', {})).result).toEqual(history)
  })
})
