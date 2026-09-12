import { getDiff } from '../lib/git/server'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/git/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/git/server')>()),
  resolveKnownRepoPath: vi.fn(async (requested: string, workspace: string) => {
    if (workspace !== 'cards-test') throw new Error('Unknown repository')
    return requested
  }),
  getRecentRepos: vi.fn(async () => [
    { name: 'Example', path: '/example/repo' },
  ]),
  getStatus: vi.fn(async () => ({
    repoPath: '/example/repo',
    repoName: 'Example',
    currentBranch: 'main',
    files: [{ path: 'hello.ts', index: ' ', working_dir: 'M' }],
  })),
  getDiff: vi.fn(async () => '+added\n-removed'),
}))

const originalEnv = { ...process.env }
let temporaryHome = ''
beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'chat-cards-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'git-flow'
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
describe('git-flow chat cards', () => {
  it('keeps previews scoped and read-only', async () => {
    const card = (
      await rpc('git-flow.cards.present', { repoPath: '/example/repo' })
    ).result.appCard
    expect(card.input.repoPath).toMatch(/^git-repo-/)
    expect((await rpc(card.readMethod, card.input)).result).not.toHaveProperty(
      'diff',
    )
    expect(getDiff).not.toHaveBeenCalled()
    expect(
      (await rpc(card.readMethod, { ...card.input, detail: true })).result.diff,
    ).toContain('+added')
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect(
      (await rpc(card.readMethod, { ...card.input, filePath: '../outside' }))
        .ok,
    ).toBe(false)
  })
})
