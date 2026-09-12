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
  process.env.MOLDABLE_APP_ID = 'chess'
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
describe('chess chat cards', () => {
  it('keeps hydration bounded and bound to its authoritative record', async () => {
    const response = await app.request('/api/game/new', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'cards-test',
      },
      body: JSON.stringify({
        mode: 'local',
        playerColor: 'white',
        difficulty: 'club',
      }),
    })
    const session = await response.json()
    const input = { gameId: session.game.id }
    const card = (await rpc('chess.cards.present', input)).result.appCard
    expect(card.input).toEqual(input)
    const before = (await rpc(card.readMethod, input)).result
    expect(before.revision).toBe(session.game.revision)
    expect((await rpc(card.readMethod, input, 'other')).ok).toBe(false)
    const moved = await rpc('chess.cards.move', {
      ...input,
      expectedRevision: before.revision,
      move: 'e2e4',
    })
    expect(moved.ok).toBe(true)
    expect(moved.result.revision).toBe(before.revision + 1)
    expect(
      (
        await rpc('chess.cards.move', {
          ...input,
          expectedRevision: before.revision,
          move: 'e7e5',
        })
      ).ok,
    ).toBe(false)
    expect((await rpc(card.readMethod, input)).result.fen).toBe(
      moved.result.fen,
    )
  })
})
