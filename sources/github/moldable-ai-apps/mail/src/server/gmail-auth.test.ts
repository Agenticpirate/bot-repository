import { getAuthUrl } from './gmail-auth'
import { mkdtemp, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

describe('Gmail OAuth PKCE state', () => {
  let moldableHome = ''

  beforeEach(async () => {
    moldableHome = await mkdtemp(join(tmpdir(), 'mail-oauth-test-'))
    process.env.MOLDABLE_HOME = moldableHome
    process.env.MOLDABLE_APP_ID = 'mail'
    process.env.MOLDABLE_WORKSPACE_ID = 'personal'
    delete process.env.MOLDABLE_APP_DATA_DIR
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('creates one private, high-entropy state file', async () => {
    const authUrl = new URL(await getAuthUrl('personal'))
    const state = authUrl.searchParams.get('state')
    expect(state).toMatch(/^[a-zA-Z0-9_-]{40,100}$/)

    const oauthDir = join(
      moldableHome,
      'workspaces',
      'personal',
      'apps',
      'mail',
      'data',
      'oauth',
    )
    const files = await readdir(oauthDir)
    expect(files).toEqual([`gmail-${state}.json`])
    const metadata = await stat(join(oauthDir, files[0]!))
    expect(metadata.mode & 0o777).toBe(0o600)
  })

  it('rejects an invalid workspace before writing state', async () => {
    await expect(getAuthUrl('../work')).rejects.toThrow('Invalid workspace')
  })
})
