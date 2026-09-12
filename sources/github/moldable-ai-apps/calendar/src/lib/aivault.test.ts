import {
  aivaultInvocationScopeArgs,
  googleCalendarCredentialId,
} from './aivault'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('Calendar aivault credential selection', () => {
  it('pins the legacy workspace Calendar credential', () => {
    assert.equal(
      googleCalendarCredentialId('personal'),
      'google-calendar:ws:personal',
    )
    assert.deepEqual(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'google-calendar/events',
        groupId: null,
      }),
      [
        '--workspace-id',
        'personal',
        '--credential',
        'google-calendar:ws:personal',
      ],
    )
  })

  it('pins an added account to its exact group credential', () => {
    assert.deepEqual(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'google-calendar/lists',
        groupId: 'calendar-account-abc123',
      }),
      [
        '--workspace-id',
        'personal',
        '--group-id',
        'calendar-account-abc123',
        '--credential',
        'google-calendar:group:personal:calendar-account-abc123',
      ],
    )
  })

  it('does not invent a credential pin for another provider', () => {
    assert.deepEqual(
      aivaultInvocationScopeArgs({
        workspaceId: 'personal',
        capability: 'firecrawl/search',
      }),
      ['--workspace-id', 'personal'],
    )
  })
})
