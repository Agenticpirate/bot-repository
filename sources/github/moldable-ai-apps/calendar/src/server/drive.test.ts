import { app, nativeCalendarEvent } from './app'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

const originalEnv = { ...process.env }
const workspaceId = 'drive-test'
let tempHome = ''

before(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'calendar-drive-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'calendar',
  }
})

after(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-rpc': '1',
      'x-moldable-workspace': workspaceId,
    },
    body: JSON.stringify({ method, params }),
  })
}

describe('Calendar drive contract', () => {
  it('persists the month inspector width per workspace', async () => {
    const headers = {
      'content-type': 'application/json',
      'x-moldable-workspace': workspaceId,
    }
    const savedResponse = await app.request('/api/preferences', {
      method: 'POST',
      headers,
      body: JSON.stringify({ monthInspectorWidth: 336 }),
    })
    assert.equal(savedResponse.status, 200)
    assert.deepEqual(await savedResponse.json(), {
      monthInspectorWidth: 336,
    })

    const restoredResponse = await app.request('/api/preferences', { headers })
    assert.equal(restoredResponse.status, 200)
    assert.deepEqual(await restoredResponse.json(), {
      monthInspectorWidth: 336,
    })

    const invalidResponse = await app.request('/api/preferences', {
      method: 'POST',
      headers,
      body: JSON.stringify({ monthInspectorWidth: 900 }),
    })
    assert.equal(invalidResponse.status, 400)
  })

  it('describes views and rejects impossible dates with Zod', async () => {
    const describeResponse = await rpc('calendar.ui.describe')
    assert.equal(describeResponse.status, 200)
    const described = (await describeResponse.json()) as {
      result: { views: Array<{ id: string }> }
    }
    assert.deepEqual(
      described.result.views.map((view) => view.id),
      ['day', 'month'],
    )

    const rejected = await rpc('calendar.ui.showDay', {
      date: '2026-02-31',
    })
    assert.equal(rejected.status, 400)
    assert.match(JSON.stringify(await rejected.json()), /invalid_params/)
  })

  it('keeps the latest workspace intent and acknowledges by id', async () => {
    await rpc('calendar.ui.showDay', { date: '2026-07-27' })
    const monthResponse = await rpc('calendar.ui.showMonth', {
      month: '2026-08',
    })
    const month = (await monthResponse.json()) as {
      result: { intentId: string }
    }

    const pendingResponse = await app.request('/api/moldable/ui-intent', {
      headers: { 'x-moldable-workspace': workspaceId },
    })
    const pending = (await pendingResponse.json()) as {
      id: string
      view: string
      entityId: string
    }
    assert.equal(pending.id, month.result.intentId)
    assert.equal(pending.view, 'month')
    assert.equal(pending.entityId, '2026-08')

    const ackResponse = await app.request(
      `/api/moldable/ui-intent?id=${month.result.intentId}`,
      {
        method: 'DELETE',
        headers: { 'x-moldable-workspace': workspaceId },
      },
    )
    assert.deepEqual(await ackResponse.json(), { ok: true, deleted: true })
  })

  it('reads a faithful empty range when the workspace is disconnected', async () => {
    const readResponse = await rpc('calendar.ui.read', {
      view: 'day',
      entityId: '2026-07-27',
    })
    assert.equal(readResponse.status, 200)
    const read = (await readResponse.json()) as {
      result: {
        entityId: string
        connected: boolean
        events: unknown[]
        timeMin: string
        timeMax: string
      }
    }
    assert.equal(read.result.entityId, '2026-07-27')
    assert.equal(read.result.connected, false)
    assert.deepEqual(read.result.events, [])
    assert.ok(read.result.timeMin < read.result.timeMax)
  })

  it('returns a renderable mobile connection state instead of an empty payload', async () => {
    const response = await rpc('calendar.native.events', {
      view: 'today',
      maxResults: 30,
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      result: {
        connected: boolean
        events: unknown[]
        emptyStates: Array<{ title: string }>
      }
    }
    assert.equal(body.result.connected, false)
    assert.deepEqual(body.result.events, [])
    assert.equal(
      body.result.emptyStates[0]?.title,
      'Connect Calendar on your Mac',
    )
  })

  it('projects a bounded native day picker without requiring a provider connection', async () => {
    const response = await rpc('calendar.native.events', { view: 'picker' })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      result: {
        selectedDate: string
        minimumDate: string
        maximumDate: string
      }
    }
    assert.match(body.result.selectedDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(body.result.minimumDate < body.result.selectedDate)
    assert.ok(body.result.maximumDate > body.result.selectedDate)
  })

  it('projects sanitized descriptions, recurrence labels, and attendee initials', () => {
    const event = nativeCalendarEvent({
      id: 'event-1',
      title: 'Planning',
      start: '2026-08-04T14:00:00.000Z',
      end: '2026-08-04T15:00:00.000Z',
      isAllDay: false,
      location: null,
      link: null,
      status: null,
      colorId: null,
      description: '<script>bad()</script>## Agenda\nSafe notes',
      recurrence: ['RRULE:FREQ=WEEKLY;INTERVAL=2'],
      attendees: [
        {
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
          responseStatus: 'accepted',
        },
      ],
    })

    assert.equal(event.recurrenceLabel, 'Every 2 weeks')
    assert.equal(event.attendees[0]?.initials, 'AL')
    assert.match(event.descriptionSections[0]?.text ?? '', /Safe notes/)
    assert.doesNotMatch(
      event.descriptionSections[0]?.text ?? '',
      /bad\(\)|script/i,
    )
  })
})
