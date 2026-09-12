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
  process.env.MOLDABLE_APP_ID = 'slides'
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
describe('slides chat cards', () => {
  it('keeps preview payloads scoped and hydrates selected details on request', async () => {
    const item = (
      await rpc('slides.decks.create', {
        title: 'Preview deck',
        slides: [
          { name: 'Start', bodyHtml: '<h1>Start</h1>', notes: 'First note' },
          { name: 'Next', bodyHtml: '<h1>Next</h1>' },
        ],
      })
    ).result
    const card = (await rpc('slides.cards.present', { id: item.id })).result
      .appCard
    expect(card.input.id).toBe(item.id)
    const preview = (await rpc(card.readMethod, card.input)).result
    expect(preview.title).toBe(item.title)
    expect(JSON.stringify(preview)).not.toContain('<h1>')
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect(preview.slides[0]).not.toHaveProperty('notes')
    expect(
      (await rpc(card.readMethod, { ...card.input, detail: true })).result
        .slides[0].notes,
    ).toBe('First note')
    expect(
      (await rpc(card.readMethod, { ...card.input, slideIds: ['missing'] }))
        .result.slides,
    ).toEqual([])
  })
})
