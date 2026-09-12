import { app } from './app'
import { previewTable } from './db'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./db')>()),
  resolveConnectionId: vi.fn(
    async (workspace: string, _dir: string, id: string) => {
      if (workspace !== 'cards-test' || id !== 'connection')
        throw new Error('Unknown connection')
      return id
    },
  ),
  previewTable: vi.fn(async () => ({
    schema: 'public',
    table: 'people',
    columns: [
      { name: 'id', dataType: 'text', nullable: false },
      { name: 'blob', dataType: 'json', nullable: true },
    ],
    rows: [{ id: 'a'.repeat(300), blob: { huge: 'content' } }],
    hasMore: true,
  })),
}))

const originalEnv = { ...process.env }
let temporaryHome = ''
beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'chat-cards-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'db-browser'
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
describe('db-browser chat cards', () => {
  it('keeps previews scoped and read-only', async () => {
    const card = (
      await rpc('db-browser.cards.present', {
        connectionId: 'connection',
        schema: 'public',
        table: 'people',
      })
    ).result.appCard
    expect(card.input).toEqual({
      connectionId: 'connection',
      schema: 'public',
      table: 'people',
    })
    const preview = (await rpc(card.readMethod, card.input)).result
    expect(preview.rows[0]).toEqual(['a'.repeat(80), '[Structured value]'])
    expect(vi.mocked(previewTable).mock.calls[0]?.slice(2, 7)).toEqual([
      'connection',
      'public',
      'people',
      4,
      0,
    ])
    await rpc(card.readMethod, { ...card.input, detail: true })
    expect(vi.mocked(previewTable).mock.calls[1]?.[5]).toBe(40)
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect(
      (await rpc(card.readMethod, { ...card.input, sql: 'DELETE FROM people' }))
        .ok,
    ).toBe(false)
  })
})
