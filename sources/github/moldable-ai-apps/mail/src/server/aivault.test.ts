import { aivaultInvocationScopeArgs, googleGmailCredentialId } from './aivault'
import { describe, expect, it } from 'vitest'

describe('Gmail aivault credential selection', () => {
  it('pins a legacy workspace-scoped Gmail credential', () => {
    expect(googleGmailCredentialId('personal')).toBe('google-gmail:ws:personal')
    expect(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'google-gmail/profile',
        groupId: null,
      }),
    ).toEqual([
      '--workspace-id',
      'personal',
      '--credential',
      'google-gmail:ws:personal',
    ])
  })

  it('pins the exact group credential for an added Gmail account', () => {
    expect(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'google-gmail/messages-read',
        groupId: 'gmail-account-abc123',
      }),
    ).toEqual([
      '--workspace-id',
      'personal',
      '--group-id',
      'gmail-account-abc123',
      '--credential',
      'google-gmail:group:personal:gmail-account-abc123',
    ])
  })

  it('does not invent a credential pin for another provider', () => {
    expect(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'firecrawl/search',
      }),
    ).toEqual(['--workspace-id', 'personal'])
  })
})
