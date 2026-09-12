import {
  getMailAccountCacheDir,
  getMailAccountCacheDirForAccount,
  getMailAccountDataDir,
  getMailAccountDataDirForAccount,
  mailAccountScopeKey,
  runWithMailAccountContext,
} from './mail-account-context'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('MOLDABLE_HOME', '/tmp/moldable-mail-context-test')
  vi.stubEnv('MOLDABLE_APP_ID', 'mail')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mail account isolation', () => {
  it('uses separate data and scheduler keys for each Gmail account', () => {
    const accountA = runWithMailAccountContext(
      { workspaceId: 'work', accountId: 'account-a' },
      () => ({
        cacheDir: getMailAccountCacheDir('work'),
        dataDir: getMailAccountDataDir('work'),
        scopeKey: mailAccountScopeKey('work'),
      }),
    )
    const accountB = runWithMailAccountContext(
      { workspaceId: 'work', accountId: 'account-b' },
      () => ({
        cacheDir: getMailAccountCacheDir('work'),
        dataDir: getMailAccountDataDir('work'),
        scopeKey: mailAccountScopeKey('work'),
      }),
    )

    expect(accountA.dataDir).not.toBe(accountB.dataDir)
    expect(accountA.cacheDir).not.toBe(accountB.cacheDir)
    expect(accountA.dataDir).toContain('/accounts/account-a')
    expect(accountB.dataDir).toContain('/accounts/account-b')
    expect(accountA.cacheDir).toContain(
      '/cache/workspaces/work/apps/mail/accounts/account-a',
    )
    expect(accountB.cacheDir).toContain(
      '/cache/workspaces/work/apps/mail/accounts/account-b',
    )
    expect(accountA.scopeKey).toBe('work:account-a')
    expect(accountB.scopeKey).toBe('work:account-b')
  })

  it('keeps an existing single-account install on its legacy cache path', () => {
    const legacy = runWithMailAccountContext(
      {
        workspaceId: 'personal',
        accountId: 'legacy-account',
        useLegacyStorage: true,
      },
      () => getMailAccountDataDir('personal'),
    )

    expect(legacy).not.toContain('/accounts/legacy-account')
  })

  it('derives an exact safe directory without ambient request context', () => {
    const dataDir = getMailAccountDataDirForAccount({
      workspaceId: 'personal',
      accountId: '../../other-account',
    })

    expect(dataDir).toContain('/accounts/______other-account')
    expect(dataDir).not.toContain('../')

    const cacheDir = getMailAccountCacheDirForAccount({
      workspaceId: 'personal',
      accountId: '../../other-account',
    })
    expect(cacheDir).toContain('/accounts/______other-account')
    expect(cacheDir).not.toContain('../')
  })
})
