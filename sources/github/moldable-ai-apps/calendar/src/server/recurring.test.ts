import { app, buildGoogleRecurrenceLines, nativeCalendarEvent } from './app'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('Calendar recurring events', () => {
  it('builds a bounded weekly Google RRULE from structured input', () => {
    assert.deepEqual(
      buildGoogleRecurrenceLines({
        frequency: 'weekly',
        interval: 2,
        byDay: ['MO', 'WE'],
        count: 8,
        weekStartsOn: 'MO',
      }),
      ['RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=8;WKST=MO'],
    )
  })

  it('normalizes an RFC3339 recurrence boundary to UTC RRULE form', () => {
    assert.deepEqual(
      buildGoogleRecurrenceLines({
        frequency: 'monthly',
        byMonthDay: [1, -1],
        until: '2027-01-01T00:00:00-05:00',
      }),
      ['RRULE:FREQ=MONTHLY;BYMONTHDAY=1,-1;UNTIL=20270101T050000Z'],
    )
  })

  it('projects recurring master and occurrence identity to clients', () => {
    const projected = nativeCalendarEvent({
      id: 'instance-1',
      title: 'Planning',
      start: '2026-08-31T14:00:00Z',
      end: '2026-08-31T15:00:00Z',
      isAllDay: false,
      location: null,
      link: null,
      status: 'confirmed',
      colorId: null,
      recurrence: null,
      recurringEventId: 'series-1',
      originalStartTime: '2026-08-31T14:00:00Z',
    })

    assert.equal(projected.recurringEventId, 'series-1')
    assert.equal(projected.originalStartTime, '2026-08-31T14:00:00Z')
    assert.equal(projected.recurrenceLabel, 'Recurring event')
  })

  it('exposes strict instance, update, and delete RPC entry points', async () => {
    for (const method of [
      'calendar.events.recurring.instances',
      'calendar.events.update',
      'calendar.events.delete',
    ]) {
      const response = await app.request('/api/moldable/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-moldable-rpc': '1',
          'x-moldable-workspace': 'recurring-rpc-test',
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

  it('rejects an ambiguous recurrence end before contacting Google', async () => {
    const response = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-rpc': '1',
        'x-moldable-workspace': 'recurring-rpc-test',
      },
      body: JSON.stringify({
        method: 'calendar.events.create',
        params: {
          summary: 'Planning',
          start: '2026-08-31T14:00:00Z',
          end: '2026-08-31T15:00:00Z',
          recurrence: {
            frequency: 'weekly',
            count: 8,
            until: '2026-12-31T23:59:59Z',
          },
        },
      }),
    })
    const body = (await response.json()) as { error?: { code?: string } }
    assert.equal(response.status, 400)
    assert.equal(body.error?.code, 'invalid_params')
  })
})
