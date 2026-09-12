import type { MailStatus } from '../types'
import { hasGmailConnectionChanged } from './gmail-connection-state'
import { describe, expect, it } from 'vitest'

function status(
  accounts: Array<{
    id: string
    emailAddress: string
    authenticated?: boolean
  }>,
  activeAccountId = accounts[0]?.id ?? null,
): MailStatus {
  return {
    authenticated: accounts.some((account) => account.authenticated !== false),
    profile: null,
    accounts,
    activeAccountId,
  }
}

describe('hasGmailConnectionChanged', () => {
  it('detects a newly registered account regardless of account order', () => {
    const before = status([{ id: 'one', emailAddress: 'one@example.com' }])
    const after = status(
      [
        { id: 'two', emailAddress: 'two@example.com' },
        { id: 'one', emailAddress: 'one@example.com' },
      ],
      'two',
    )

    expect(hasGmailConnectionChanged(before, after)).toBe(true)
  })

  it('detects an account becoming authenticated again', () => {
    const before = status([
      {
        id: 'one',
        emailAddress: 'one@example.com',
        authenticated: false,
      },
    ])
    const after = status([{ id: 'one', emailAddress: 'one@example.com' }])

    expect(hasGmailConnectionChanged(before, after)).toBe(true)
  })

  it('does not treat profile or sync updates as an account change', () => {
    const before = status([{ id: 'one', emailAddress: 'one@example.com' }])
    const after = {
      ...before,
      syncing: true,
      profile: { emailAddress: 'one@example.com', messagesTotal: 12 },
    }

    expect(hasGmailConnectionChanged(before, after)).toBe(false)
  })
})
