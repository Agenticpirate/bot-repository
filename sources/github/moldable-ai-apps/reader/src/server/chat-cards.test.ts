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
  process.env.MOLDABLE_APP_ID = 'reader'
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
describe('reader cards', () => {
  it('keeps selection scoped and reading state unchanged', async () => {
    const { seedDefaultBooks, setProgress, getProgress } = await import(
      './book-store'
    )
    const { getAppDataDir } = await import('@moldable-ai/storage')
    const dataDir = getAppDataDir('cards-test')
    await seedDefaultBooks(dataDir)
    await setProgress(dataDir, 'aesops-fables', { chapterIndex: 1 })
    const card = (
      await rpc('reader.cards.present', { bookId: 'aesops-fables' })
    ).result.appCard
    expect(card.input.chapterIndex).toBe(1)
    await setProgress(dataDir, 'aesops-fables', { chapterIndex: 2 })
    const before = await getProgress(dataDir, 'aesops-fables')
    const read = (await rpc(card.readMethod, card.input)).result
    expect(read.chapterIndex).toBe(1)
    expect(read.text.length).toBeGreaterThan(0)
    expect(await getProgress(dataDir, 'aesops-fables')).toEqual(before)
    expect((await rpc(card.readMethod, card.input, 'other')).error).toBeTruthy()
  })
})
