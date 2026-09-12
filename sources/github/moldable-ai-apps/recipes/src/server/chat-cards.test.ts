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
  process.env.MOLDABLE_APP_ID = 'recipes'
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
describe('recipes cards', () => {
  it('scopes detail reads and keeps compact data minimal', async () => {
    const recipe = (
      await rpc('recipes.create', {
        title: 'Card soup',
        ingredients: ['One onion'],
        instructions: 'Cook gently.',
      })
    ).result
    const presented = (await rpc('recipes.cards.present', { ids: [recipe.id] }))
      .result.appCard
    expect(presented.input).toEqual({ ids: [recipe.id] })
    const preview = (await rpc(presented.readMethod, presented.input)).result
    expect(preview.items[0]).not.toHaveProperty('instructions')
    expect(
      (
        await rpc(presented.readMethod, {
          ...presented.input,
          detailId: recipe.id,
        })
      ).result.detail.instructions,
    ).toBe('Cook gently.')
    expect(
      (
        await rpc(presented.readMethod, {
          ...presented.input,
          detailId: 'foreign',
        })
      ).ok,
    ).toBe(false)
    expect(
      (await rpc(presented.readMethod, presented.input, 'other')).result.items,
    ).toEqual([])
  })
})
