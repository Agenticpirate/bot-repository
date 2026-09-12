import {
  getMailAccountCacheDirForAccount,
  getMailAccountDataDirForAccount,
} from './mail-account-context'
import {
  getMailAccountsState,
  registerMailAccount,
  removeMailAccount,
} from './mail-accounts'
import { mkdir, mkdtemp, readdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const aivault = vi.hoisted(() => ({
  deleteGroupSecret: vi.fn(async () => {}),
  deleteWorkspaceSecret: vi.fn(async () => {}),
  findGroupSecret: vi.fn(async () => ({ name: 'GOOGLE_GMAIL_OAUTH' })),
  findWorkspaceSecret: vi.fn(async () => null),
  invokeAivaultJson: vi.fn(async () => ({ emailAddress: 'same@example.com' })),
  upsertGroupSecret: vi.fn(async () => {}),
  upsertWorkspaceSecret: vi.fn(async () => {}),
}))

vi.mock('./aivault', () => aivault)

const ORIGINAL_ENV = { ...process.env }

describe('mail account registry', () => {
  let moldableHome = ''

  beforeEach(async () => {
    moldableHome = await mkdtemp(join(tmpdir(), 'mail-accounts-test-'))
    process.env.MOLDABLE_HOME = moldableHome
    process.env.MOLDABLE_APP_ID = 'mail'
    process.env.MOLDABLE_WORKSPACE_ID = 'personal'
    delete process.env.MOLDABLE_APP_DATA_DIR
    vi.clearAllMocks()
    aivault.findWorkspaceSecret.mockResolvedValue(null)
    aivault.invokeAivaultJson.mockResolvedValue({
      emailAddress: 'same@example.com',
    })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('serializes simultaneous callbacks for the same Gmail address', async () => {
    const [left, right] = await Promise.all([
      registerMailAccount({
        workspaceId: 'personal',
        candidateAccountId: 'candidate-a',
        vaultPayload: '{"refreshToken":"a"}',
      }),
      registerMailAccount({
        workspaceId: 'personal',
        candidateAccountId: 'candidate-b',
        vaultPayload: '{"refreshToken":"b"}',
      }),
    ])

    const state = await getMailAccountsState('personal')
    expect(state.accounts).toHaveLength(1)
    expect(left.accountId).toBe(right.accountId)
    expect(state.accounts[0]?.emailAddress).toBe('same@example.com')
    expect(aivault.deleteGroupSecret).toHaveBeenCalledTimes(1)
  })

  it('removes the disconnected account cache and attachment directory', async () => {
    const account = await registerMailAccount({
      workspaceId: 'personal',
      candidateAccountId: 'candidate-cache',
      vaultPayload: '{"refreshToken":"a"}',
    })
    const accountDir = getMailAccountDataDirForAccount(account)
    const accountCacheDir = getMailAccountCacheDirForAccount(account)
    await mkdir(join(accountDir, 'messages'), { recursive: true })
    await mkdir(join(accountDir, 'attachments'), { recursive: true })
    await mkdir(join(accountCacheDir, 'messages'), { recursive: true })
    await writeFile(join(accountDir, 'messages', 'message.json'), '{}')
    await writeFile(join(accountDir, 'attachments', 'body.bin'), 'private')
    await writeFile(join(accountCacheDir, 'messages', 'message.json'), '{}')

    await removeMailAccount('personal', account.accountId)

    await expect(stat(accountDir)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(accountCacheDir)).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect((await getMailAccountsState('personal')).accounts).toEqual([])
    expect(aivault.deleteGroupSecret).toHaveBeenCalled()
    expect(await readdir(join(accountDir, '..'))).toEqual([])
  })
})
