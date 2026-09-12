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
  process.env.MOLDABLE_APP_ID = 'affirmations'
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
describe('affirmations cards', () => {
  it('reads authoritative state without changing it', async () => {
    const item = (await rpc('affirmations.list', { limit: 1 })).result[0]
    const card = (
      await rpc('affirmations.cards.present', {
        categoryId: item.categoryId,
        text: item.text,
      })
    ).result.appCard
    const read = (await rpc(card.readMethod, card.input)).result
    expect(read.text).toBe(item.text)
    expect(read.categoryName).toBe(item.categoryName)
    expect(
      (
        await rpc('affirmations.cards.present', {
          categoryId: item.categoryId,
          text: 'Not a known affirmation',
        })
      ).ok,
    ).toBe(false)
  })
})
