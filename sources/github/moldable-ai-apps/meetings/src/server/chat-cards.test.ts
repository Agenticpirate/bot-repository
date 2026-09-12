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
  process.env.MOLDABLE_APP_ID = 'meetings'
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
describe('meetings cards', () => {
  it('scopes detail reads and keeps compact data minimal', async () => {
    const { mergeAndSaveMeeting } = await import('../lib/storage.server')
    await mergeAndSaveMeeting(
      {
        id: 'card-meeting',
        title: 'Card meeting',
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: 120,
        notes: 'Summary of the meeting.',
        segments: [
          {
            id: 'segment',
            text: 'Transcript content.',
            startTime: 0,
            endTime: 10,
            isFinal: true,
            createdAt: new Date(),
          },
        ],
        recordingSessions: [
          {
            id: 'recording',
            startedAt: new Date(),
            audioPath: 'audio/recording.webm',
          },
        ],
      },
      'cards-test',
    )
    const presented = (
      await rpc('meetings.cards.present', { id: 'card-meeting' })
    ).result.appCard
    const preview = (await rpc(presented.readMethod, presented.input)).result
    expect(preview.transcript).toBe('')
    expect(preview.sessions).toEqual([])
    const detail = (
      await rpc(presented.readMethod, { ...presented.input, detail: true })
    ).result
    expect(detail.transcript).toContain('Transcript content.')
    expect(detail.sessions[0].id).toBe('recording')
    expect(detail.sessions[0]).not.toHaveProperty('audioPath')
    expect((await rpc(presented.readMethod, presented.input, 'other')).ok).toBe(
      false,
    )
  })
})
