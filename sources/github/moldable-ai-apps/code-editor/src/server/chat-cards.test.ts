import { app } from './app'
import { createHash } from 'node:crypto'
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let temporaryHome = ''
beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'chat-cards-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'code-editor'
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
describe('code-editor chat cards', () => {
  it('keeps previews scoped and read-only', async () => {
    const root = join(temporaryHome, 'project')
    await mkdir(root)
    await writeFile(join(root, 'hello.ts'), 'export const hello = 1')
    await writeFile(join(temporaryHome, 'outside.ts'), 'outside')
    await symlink(join(temporaryHome, 'outside.ts'), join(root, 'escape.ts'))
    await rpc('code-editor.project.set', { rootPath: root })
    const projectId = `code-project-${createHash('sha256').update(root).digest('hex').slice(0, 16)}`
    const card = (
      await rpc('code-editor.cards.present', {
        projectId,
        relativePath: 'hello.ts',
      })
    ).result.appCard
    expect(card.input).toEqual({ projectId, relativePath: 'hello.ts' })
    expect(
      (await rpc(card.readMethod, card.input)).result.codeBlocks[0].code,
    ).toBe('export const hello = 1')
    expect((await rpc(card.readMethod, card.input, 'other')).ok).toBe(false)
    expect(
      (
        await rpc('code-editor.cards.present', {
          projectId,
          relativePath: 'escape.ts',
        })
      ).ok,
    ).toBe(false)
    expect(
      (
        await rpc('code-editor.cards.present', {
          projectId,
          relativePath: '../outside.ts',
        })
      ).ok,
    ).toBe(false)
  })
})
