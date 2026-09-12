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
  process.env.MOLDABLE_APP_ID = 'microscope'
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
describe('microscope chat cards', () => {
  it('keeps hydration bounded and bound to its authoritative record', async () => {
    const dataDir = getAppDataDir('cards-test')
    await ensureDir(dataDir)
    const entry = {
      id: 'sample',
      source: 'generated',
      title: 'Cell',
      subtitle: 'Inside a cell',
      description: 'Cell details',
      categoryId: 'cells-microbes',
      scale: 'microscopic',
      status: 'ready',
      modelStatus: 'ready',
      imageFileName: 'image.png',
      modelFileName: 'model.glb',
      imageUrl: null,
      model: {
        kind: 'cell',
        seed: 1,
        palette: ['#888888'],
        density: 1,
        layers: 1,
        complexity: 1,
      },
      observations: ['Visible membrane'],
      details: [],
      prompts: [],
      quality: 'medium',
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    }
    await writeJson(join(dataDir, 'microscope-explorations.json'), [entry])
    const card = (await rpc('microscope.cards.present', { id: entry.id }))
      .result.appCard
    expect(card.input).toEqual({ id: entry.id })
    const preview = (await rpc(card.readMethod, card.input)).result
    expect(preview.imageUrl).toContain('workspace=cards-test')
    expect(preview).not.toHaveProperty('modelUrl')
    expect(preview).not.toHaveProperty('imageFileName')
    const detail = (await rpc(card.readMethod, { ...card.input, detail: true }))
      .result
    expect(detail.modelUrl).toContain('model.glb')
    expect(detail.observations).toEqual(['Visible membrane'])
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
  })
})
