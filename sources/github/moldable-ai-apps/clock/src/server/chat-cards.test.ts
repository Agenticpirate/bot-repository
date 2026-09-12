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
  process.env.MOLDABLE_APP_ID = 'clock'
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
describe('clock cards', () => {
  it('reads authoritative state without changing it', async () => {
    const timer = (
      await rpc('clock.timers.start', { minutes: 5, label: 'Card tea' })
    ).result
    const card = (await rpc('clock.cards.present', { id: timer.id })).result
      .appCard
    const before = (await rpc('clock.timers.list', {})).result
    const read = (await rpc(card.readMethod, card.input)).result
    expect(read.state).toBe('running')
    expect(read.currentRemainingMs).toBeGreaterThan(0)
    expect(read.endsAt).toBe(before[0].endsAt)
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
  })
})
