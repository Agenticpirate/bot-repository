import { app, applyInviteeMutations } from './app'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('Calendar invitee mutations', () => {
  it('adds, edits, and removes invitees without disturbing protected records', () => {
    const result = applyInviteeMutations(
      [
        {
          email: 'organizer@example.com',
          organizer: true,
          responseStatus: 'accepted',
        },
        {
          email: 'me@example.com',
          self: true,
          responseStatus: 'accepted',
        },
        {
          email: 'existing@example.com',
          optional: false,
          responseStatus: 'accepted',
        },
        { email: 'remove@example.com', responseStatus: 'needsAction' },
      ],
      {
        add: [{ email: 'new@example.com', optional: true }],
        update: [{ email: 'EXISTING@example.com', optional: true }],
        remove: ['remove@example.com', 'already-gone@example.com'],
        protectedEmails: ['organizer@example.com'],
      },
    )

    assert.deepEqual(
      result.map((attendee) => attendee.email),
      [
        'organizer@example.com',
        'me@example.com',
        'existing@example.com',
        'new@example.com',
      ],
    )
    assert.equal(result[2]?.optional, true)
    assert.equal(result[2]?.responseStatus, 'accepted')
    assert.equal(result[3]?.optional, true)
  })

  it('changes an invitee email case-insensitively and resets its response', () => {
    const result = applyInviteeMutations(
      [
        {
          email: 'old@example.com',
          displayName: 'Old guest',
          responseStatus: 'accepted',
        },
      ],
      {
        update: [
          {
            email: 'OLD@example.com',
            newEmail: 'new@example.com',
            displayName: 'New guest',
          },
        ],
      },
    )

    assert.equal(result[0]?.email, 'new@example.com')
    assert.equal(result[0]?.displayName, 'New guest')
    assert.equal(result[0]?.responseStatus, 'needsAction')
  })

  it('keeps add idempotent and rejects duplicate email edits', () => {
    const existing = [
      { email: 'one@example.com', responseStatus: 'accepted' },
      { email: 'two@example.com', responseStatus: 'tentative' },
    ]

    assert.equal(
      applyInviteeMutations(existing, {
        add: [{ email: 'ONE@example.com' }],
      }).length,
      2,
    )
    assert.throws(
      () =>
        applyInviteeMutations(existing, {
          update: [{ email: 'one@example.com', newEmail: 'two@example.com' }],
        }),
      { name: 'CalendarInviteeConflict' },
    )
  })

  it('refuses to edit organizer and connected-user attendee records', () => {
    assert.throws(
      () =>
        applyInviteeMutations(
          [{ email: 'organizer@example.com', organizer: true }],
          { remove: ['organizer@example.com'] },
        ),
      { name: 'CalendarProtectedInvitee' },
    )
    assert.throws(
      () =>
        applyInviteeMutations([{ email: 'me@example.com', self: true }], {
          update: [{ email: 'me@example.com', optional: true }],
        }),
      { name: 'CalendarProtectedInvitee' },
    )
  })

  it('reports an edit target that is not on the event', () => {
    assert.throws(
      () =>
        applyInviteeMutations([], {
          update: [{ email: 'missing@example.com', optional: true }],
        }),
      { name: 'CalendarInviteeNotFound' },
    )
  })

  it('exposes strict add, update, and remove RPC entry points', async () => {
    for (const method of [
      'calendar.events.invitees.add',
      'calendar.events.invitees.update',
      'calendar.events.invitees.remove',
    ]) {
      const response = await app.request('/api/moldable/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-moldable-rpc': '1',
          'x-moldable-workspace': 'invitee-rpc-test',
        },
        body: JSON.stringify({ method, params: {} }),
      })
      const body = (await response.json()) as {
        error?: { code?: string }
      }
      assert.equal(response.status, 400)
      assert.equal(body.error?.code, 'invalid_params')
    }
  })
})
