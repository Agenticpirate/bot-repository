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
  process.env.MOLDABLE_APP_ID = 'wiki'
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
describe('wiki chat cards', () => {
  it('binds card reads to selected records and handles unavailable records', async () => {
    const page = (
      await rpc('wiki.notes.create', {
        title: 'Card page',
        content: 'Original vault content',
      })
    ).result
    const presented = (await rpc('wiki.cards.present', { path: page.path }))
      .result.appCard
    const other = (await rpc('wiki.vaults.create', { name: 'Other vault' }))
      .result
    const vaultId = other.activeVaultId
    expect(vaultId).toBeTruthy()
    await rpc('wiki.vaults.switch', { id: vaultId })
    expect(
      (await rpc(presented.readMethod, presented.input)).result.content,
    ).toContain('Original vault content')
    expect(
      (await rpc('wiki.cards.read', { ...presented.input, vaultId: 'missing' }))
        .ok,
    ).toBe(false)
    expect(
      (
        await rpc('wiki.cards.read', {
          ...presented.input,
          path: '../../outside.md',
        })
      ).ok,
    ).toBe(false)
  })
})
