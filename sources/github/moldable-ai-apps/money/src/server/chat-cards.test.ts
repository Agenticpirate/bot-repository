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
  process.env.MOLDABLE_APP_ID = 'money'
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
describe('money chat cards', () => {
  it('binds hydration to saved data and never changes the source', async () => {
    const cards = (await rpc('money.cards.list', {})).result.cards
    expect(cards.length).toBeGreaterThan(0)
    const card = (await rpc('money.chat.present', { cardId: 'monthly-spend' }))
      .result.appCard
    expect(card.input).toEqual({ cardId: 'monthly-spend' })
    const preview = (await rpc(card.readMethod, card.input)).result
    expect(preview.card.id).toBe('monthly-spend')
    expect(preview).not.toHaveProperty('transactions')
    expect(
      (await rpc(card.readMethod, { ...card.input, detail: true })).result
        .transactions,
    ).toEqual([])
    expect((await rpc(card.readMethod, { cardId: 'not-a-card' })).ok).toBe(
      false,
    )
    expect(
      (
        await rpc(card.readMethod, {
          ...card.input,
          formula: 'Accounts.Balance()',
        })
      ).ok,
    ).toBe(false)
  })
})
