import {
  getCalendarAccountContext,
  runWithCalendarAccountContext,
} from './calendar/account-context'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('Calendar account context', () => {
  it('keeps parallel account operations isolated', async () => {
    const readAccount = (accountId: string) =>
      runWithCalendarAccountContext(
        {
          workspaceId: 'personal',
          accountId,
          vaultGroupId: `calendar-account-${accountId}`,
        },
        async () => {
          await Promise.resolve()
          return getCalendarAccountContext('personal')?.accountId
        },
      )

    assert.deepEqual(
      await Promise.all([readAccount('left'), readAccount('right')]),
      ['left', 'right'],
    )
    assert.equal(getCalendarAccountContext('personal'), null)
  })
})
