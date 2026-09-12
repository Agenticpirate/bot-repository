import { writeJson } from '@moldable-ai/storage'
import { getProjectMetadataPath, readProjectMetadata } from '../lib/storage'
import { app } from './app'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after as afterAll, before as beforeAll, describe, it } from 'node:test'

const originalEnv = { ...process.env }
let temporaryHome = ''
beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'chat-cards-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'remotion'
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
describe('remotion chat cards', () => {
  it('keeps preview payloads scoped and hydrates selected details on request', async () => {
    const item = (
      await rpc('remotion.projects.create', {
        name: 'Preview video',
        compositionCode:
          'export const Composition = () => <AbsoluteFill>Hello</AbsoluteFill>;',
      })
    ).result
    const metadata = await readProjectMetadata('cards-test', item.id)
    await writeJson(getProjectMetadataPath('cards-test', item.id), {
      ...metadata,
      thumbnail: 'data:image/png;base64,aGVsbG8=',
    })
    const card = (await rpc('remotion.cards.present', { id: item.id })).result
      .appCard
    const preview = (await rpc(card.readMethod, card.input)).result
    assert.equal(preview.thumbnail.startsWith('/api/projects/'), true)
    assert.equal(JSON.stringify(preview).includes('base64'), false)
    const thumbnail = await app.request(preview.thumbnail, {
      headers: { 'x-moldable-workspace': 'cards-test' },
    })
    assert.equal(thumbnail.headers.get('content-type'), 'image/png')
    assert.equal(await thumbnail.text(), 'hello')
    assert.deepEqual(card.input, { id: item.id })
    assert.equal(
      'compositionCode' in (await rpc(card.readMethod, card.input)).result,
      false,
    )
    assert.match(
      (await rpc(card.readMethod, { ...card.input, detail: true })).result
        .compositionCode,
      /Hello/,
    )
    assert.equal((await rpc(card.readMethod, card.input, 'other')).ok, false)
  })
})
