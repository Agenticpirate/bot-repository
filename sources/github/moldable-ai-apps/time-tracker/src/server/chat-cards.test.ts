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
  process.env.MOLDABLE_APP_ID = 'time-tracker'
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
describe('time-tracker cards', () => {
  it('reads authoritative state without changing it', async () => {
    const project = (
      await rpc('time-tracker.projects.create', { name: 'Card project' })
    ).result
    await rpc('time-tracker.timer.startByProjectId', {
      projectId: project.id,
      description: 'Focused work',
    })
    const card = (await rpc('time-tracker.cards.present', { view: 'timer' }))
      .result.appCard
    const read = (await rpc(card.readMethod, card.input)).result
    expect(read.projectName).toBe('Card project')
    expect(read.timer.description).toBe('Focused work')
    expect(read.timer.isRunning).toBe(true)
    expect(
      (await rpc(card.readMethod, card.input, 'other')).result.timer.isRunning,
    ).toBe(false)
    const summaryCard = (
      await rpc('time-tracker.cards.present', {
        view: 'summary',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      })
    ).result.appCard
    expect(
      (await rpc(summaryCard.readMethod, summaryCard.input)).result
        .totalSeconds,
    ).toBe(0)
  })
})
