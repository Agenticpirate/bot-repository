import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }
const MEETING_ID = 'meeting-proof'

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  temporaryHome = await mkdtemp(path.join(tmpdir(), 'meetings-drive-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'meetings'
  const storage = await import('../lib/storage.server')
  await storage.mergeAndSaveMeeting(
    {
      id: MEETING_ID,
      title: 'Planning proof',
      createdAt: new Date('2026-07-27T10:00:00Z'),
      updatedAt: new Date('2026-07-27T10:30:00Z'),
      endedAt: new Date('2026-07-27T10:30:00Z'),
      duration: 1800,
      notes: 'Decision: ship the drive contract.',
      enhancedNotes: '## Summary\nThe team approved the rollout.',
      calendarContext: {
        title: 'Planning review',
        start: '2026-07-27T10:00:00Z',
        organizer: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          organizer: true,
        },
        attendees: [
          {
            name: 'Grace Hopper',
            email: 'grace@example.com',
            responseStatus: 'accepted',
          },
        ],
      },
      segments: [
        {
          id: 'segment-1',
          text: 'We approved the rollout.',
          startTime: 0,
          endTime: 4,
          speaker: 'Ada',
          isFinal: true,
          createdAt: new Date('2026-07-27T10:00:01Z'),
        },
      ],
    },
    WORKSPACE,
  )
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

describe('Meetings drive contract', () => {
  it('describes and navigates to a real meeting', async () => {
    const described = (await (
      await rpc('meetings.ui.describe', {})
    ).json()) as { result: { views: Array<{ id: string }> } }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'list',
      'meeting',
    ])

    const navigation = (await (
      await rpc('meetings.ui.navigate', {
        view: 'meeting',
        entityId: MEETING_ID,
      })
    ).json()) as { result: { intentId: string } }
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string; entityId: string }
    expect(intent).toMatchObject({
      id: navigation.result.intentId,
      view: 'meeting',
      entityId: MEETING_ID,
    })
    const ack = await app.request(`/api/moldable/ui-intent?id=${intent.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
  })

  it('returns notes and the complete transcript', async () => {
    const response = await rpc('meetings.ui.read', {
      view: 'meeting',
      entityId: MEETING_ID,
    })
    const body = (await response.json()) as {
      result: {
        meeting: { notes: string; enhancedNotes: string; transcript: string }
      }
    }
    expect(body.result.meeting.notes).toContain('ship the drive contract')
    expect(body.result.meeting.enhancedNotes).toContain('approved')
    expect(body.result.meeting.transcript).toBe('Ada: We approved the rollout.')
  })

  it('returns bounded mobile lists and explicit empty search results', async () => {
    const recent = (await (
      await rpc('meetings.native.list', { limit: 10 })
    ).json()) as {
      result: {
        meetings: Array<{
          id: string
          durationLabel: string
          createdAtLabel: string
        }>
        emptyStates: unknown[]
      }
    }
    expect(recent.result.meetings).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: MEETING_ID })]),
    )
    expect(recent.result.emptyStates).toEqual([])
    expect(recent.result.meetings[0]?.durationLabel).toBe('30m')
    expect(recent.result.meetings[0]?.createdAtLabel).toBeTruthy()
    expect(recent.result.meetings[0]).not.toHaveProperty('transcript')
    expect(recent.result.meetings[0]).not.toHaveProperty('notes')
    expect(recent.result.meetings[0]).not.toHaveProperty('calendarContext')
    expect(JSON.stringify(recent).length).toBeLessThan(8_000)

    const transcript = (await (
      await rpc('meetings.native.detail', {
        id: MEETING_ID,
        section: 'transcript',
      })
    ).json()) as {
      result: {
        contentDisplay: string
        truncationNotice: string
        segments: Array<{
          speakerName: string
          speakerInitials: string
          timestamp: string
        }>
      }
    }
    expect(transcript.result.contentDisplay).toBe(
      'Ada: We approved the rollout.',
    )
    expect(transcript.result.truncationNotice).toBe('')
    expect(transcript.result.segments[0]).toMatchObject({
      speakerName: 'Ada',
      speakerInitials: 'AD',
      timestamp: '0:00',
    })

    const overview = (await (
      await rpc('meetings.native.detail', {
        id: MEETING_ID,
        section: 'overview',
      })
    ).json()) as {
      result: {
        attendees: Array<{ name: string; initials: string; roleLabel: string }>
      }
    }
    expect(overview.result.attendees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Ada Lovelace',
          initials: 'AL',
          roleLabel: 'Organizer',
        }),
        expect.objectContaining({ name: 'Grace Hopper', initials: 'GH' }),
      ]),
    )

    const empty = (await (
      await rpc('meetings.native.list', { query: 'definitely absent' })
    ).json()) as {
      result: { meetings: unknown[]; emptyStates: Array<{ title: string }> }
    }
    expect(empty.result.meetings).toEqual([])
    expect(empty.result.emptyStates[0]?.title).toBe('No matching meetings')
  })

  it('opens a meeting and rejects an invalid view', async () => {
    const opened = await rpc('meetings.ui.openMeeting', {
      meetingId: MEETING_ID,
    })
    expect(opened.status).toBe(200)

    const invalid = await rpc('meetings.ui.navigate', { view: 'calendar' })
    const invalidBody = (await invalid.json()) as { error: { code: string } }
    expect(invalid.status).toBe(400)
    expect(invalidBody.error.code).toBe('invalid_params')
  })

  it('edits enhanced notes through the authoritative meeting update', async () => {
    const draftResponse = await rpc('meetings.native.detail', {
      id: MEETING_ID,
      section: 'editEnhanced',
    })
    const draft = (await draftResponse.json()) as {
      result: { enhancedNotesDraft: string }
    }
    expect(draft.result.enhancedNotesDraft).toContain('approved the rollout')

    const updatedResponse = await rpc('meetings.update', {
      id: MEETING_ID,
      enhancedNotes: '## Revised summary\nThe mobile review is complete.',
    })
    expect(updatedResponse.status).toBe(200)

    const readBack = (await (
      await rpc('meetings.native.detail', {
        id: MEETING_ID,
        section: 'enhanced',
      })
    ).json()) as { result: { contentDisplay: string } }
    expect(readBack.result.contentDisplay).toContain(
      'mobile review is complete',
    )
  })
})
