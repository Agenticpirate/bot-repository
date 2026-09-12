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
  process.env.MOLDABLE_APP_ID = 'images'
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
describe('images cards', () => {
  it('returns scoped assets without paths and loads variants on demand', async () => {
    const { getAppDataDir, writeJson, ensureDir } = await import(
      '@moldable-ai/storage'
    )
    const dataDir = getAppDataDir('cards-test')
    await ensureDir(dataDir)
    const now = new Date().toISOString()
    await writeJson(join(dataDir, 'image-threads.json'), [
      {
        id: 'thread',
        title: 'Card image',
        prompt: 'An image',
        aspectRatio: 'square',
        status: 'ready',
        createdAt: now,
        updatedAt: now,
        iterations: [
          {
            id: 'iteration',
            prompt: 'An image',
            kind: 'generation',
            aspectRatio: 'square',
            size: '1024x1024',
            quality: 'standard',
            fileName: 'image.png',
            mimeType: 'image/png',
            createdAt: now,
          },
        ],
      },
    ])
    const card = (await rpc('images.cards.present', { ids: ['thread'] })).result
      .appCard
    const compact = (await rpc(card.readMethod, card.input)).result
    expect(compact.items[0].variants).toEqual([])
    const read = (
      await rpc(card.readMethod, { ...card.input, detailId: 'thread' })
    ).result
    expect(read.items[0].variants[0].imageUrl).toContain('workspace=cards-test')
    expect(read.items[0].variants[0]).not.toHaveProperty('fileName')
    expect(read.items[0].variants[0]).not.toHaveProperty('imagePath')
    expect(
      (await rpc(card.readMethod, { ...card.input, detailId: 'foreign' })).ok,
    ).toBe(false)
    expect(
      (await rpc(card.readMethod, card.input, 'other')).result.items,
    ).toEqual([])
  })
})
