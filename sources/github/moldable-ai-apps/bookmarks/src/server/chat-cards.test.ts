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
  process.env.MOLDABLE_APP_ID = 'bookmarks'
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
describe('bookmarks cards', () => {
  it('keeps selection scoped and reading state unchanged', async () => {
    const { writeBookmarks } = await import('./bookmark-files')
    await writeBookmarks('cards-test', [
      {
        id: 'post',
        url: 'https://example.com/post',
        text: 'Saved content',
        authorName: 'Author',
        links: [],
        media: [{ type: 'photo', url: 'https://example.com/image.png' }],
        folderIds: [],
        folderNames: [],
        source: 'x-api',
        syncedAt: new Date().toISOString(),
      },
    ])
    const card = (await rpc('bookmarks.cards.present', { id: 'post' })).result
      .appCard
    const read = (await rpc(card.readMethod, card.input)).result
    expect(read.text).toBe('Saved content')
    expect(read.media[0].type).toBe('photo')
    expect((await rpc(card.readMethod, card.input, 'other')).error).toBeTruthy()
  })
})
