import type { Project, TimeEntry, TimerState } from '../lib/types'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }

let tempHome: string | undefined

function request(
  path: string,
  init: RequestInit = {},
  workspaceId = 'drive-test',
): Request {
  const headers = new Headers(init.headers)
  headers.set('x-moldable-workspace', workspaceId)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return new Request(`http://time-tracker.test${path}`, {
    ...init,
    headers,
  })
}

function rpc(method: string, params?: unknown, workspaceId?: string): Request {
  return request(
    '/api/moldable/rpc',
    {
      method: 'POST',
      body: JSON.stringify({ method, params }),
    },
    workspaceId,
  )
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

type RpcOk<T> = { ok: true; result: T }

describe('Time Tracker drive contract', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'time-tracker-app-'))
    process.env = { ...originalEnv }
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'time-tracker'
    delete process.env.MOLDABLE_APP_DATA_DIR
  })

  afterEach(async () => {
    process.env = originalEnv
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true })
      tempHome = undefined
    }
  })

  it('describes every navigable view', async () => {
    const response = await app.fetch(rpc('time-tracker.ui.describe'))
    expect(response.ok).toBe(true)
    const body = await json<RpcOk<{ views: { id: string }[] }>>(response)
    expect(body.ok).toBe(true)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'list',
      'calendar',
      'projects',
    ])
  })

  it('rejects navigation to an unknown view', async () => {
    const response = await app.fetch(
      rpc('time-tracker.ui.navigate', { view: 'settings' }),
    )
    expect(response.status).toBe(400)
    const body = await json<{ ok: boolean; error: { code: string } }>(response)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('invalid_params')
  })

  it('writes, serves, and acks a navigation intent (last wins)', async () => {
    const first = await json<RpcOk<{ intentId: string }>>(
      await app.fetch(rpc('time-tracker.ui.navigate', { view: 'list' })),
    )
    const second = await json<RpcOk<{ intentId: string }>>(
      await app.fetch(
        rpc('time-tracker.ui.navigate', {
          view: 'calendar',
          params: { date: '2026-07-01' },
        }),
      ),
    )
    expect(second.result.intentId).not.toBe(first.result.intentId)

    const current = await json<{
      id: string
      view: string
      params?: { date?: string }
    } | null>(await app.fetch(request('/api/moldable/ui-intent')))
    expect(current?.id).toBe(second.result.intentId)
    expect(current?.view).toBe('calendar')
    expect(current?.params?.date).toBe('2026-07-01')

    // Ack with a stale id leaves the intent in place.
    const staleAck = await json<{ cleared: boolean }>(
      await app.fetch(
        request(`/api/moldable/ui-intent?id=${first.result.intentId}`, {
          method: 'DELETE',
        }),
      ),
    )
    expect(staleAck.cleared).toBe(false)

    const ack = await json<{ cleared: boolean }>(
      await app.fetch(
        request(`/api/moldable/ui-intent?id=${second.result.intentId}`, {
          method: 'DELETE',
        }),
      ),
    )
    expect(ack.cleared).toBe(true)

    const afterAck = await json<unknown>(
      await app.fetch(request('/api/moldable/ui-intent')),
    )
    expect(afterAck).toBeNull()
  })

  it('starts the timer by project name, creating the project once', async () => {
    const started = await json<
      RpcOk<{ timer: TimerState; project: Project; createdProject: boolean }>
    >(
      await app.fetch(
        rpc('time-tracker.timer.start', {
          projectName: 'Deep Work',
          description: 'contract',
        }),
      ),
    )
    expect(started.ok).toBe(true)
    expect(started.result.createdProject).toBe(true)
    expect(started.result.timer.isRunning).toBe(true)
    expect(started.result.timer.description).toBe('contract')

    // Case-insensitive match reuses the project and saves the running entry.
    const switched = await json<
      RpcOk<{
        project: Project
        createdProject: boolean
        stoppedEntry: TimeEntry | null
      }>
    >(
      await app.fetch(
        rpc('time-tracker.timer.start', { projectName: 'deep work' }),
      ),
    )
    expect(switched.result.createdProject).toBe(false)
    expect(switched.result.project.id).toBe(started.result.project.id)
    expect(switched.result.stoppedEntry?.projectId).toBe(
      started.result.project.id,
    )
  })

  it('stops the timer and returns a speakable summary', async () => {
    await app.fetch(
      rpc('time-tracker.timer.start', { projectName: 'Client A' }),
    )

    const stopped = await json<
      RpcOk<{ entry: TimeEntry; projectName: string; summary: string }>
    >(await app.fetch(rpc('time-tracker.timer.stop')))
    expect(stopped.ok).toBe(true)
    expect(stopped.result.projectName).toBe('Client A')
    expect(stopped.result.entry.endTime).toBeTruthy()
    expect(stopped.result.summary).toContain('Client A')

    const again = await app.fetch(rpc('time-tracker.timer.stop'))
    expect(again.status).toBe(400)
  })

  it('reads the current state as speakable text', async () => {
    const idle = await json<RpcOk<{ text: string }>>(
      await app.fetch(rpc('time-tracker.ui.read')),
    )
    expect(idle.result.text).toContain('No timer is running.')

    await app.fetch(rpc('time-tracker.timer.start', { projectName: 'Writing' }))
    const running = await json<RpcOk<{ text: string }>>(
      await app.fetch(rpc('time-tracker.ui.read', { view: 'projects' })),
    )
    expect(running.result.text).toContain('The timer is running on Writing')
    expect(running.result.text).toContain('Active projects: Writing.')
    expect(running.result.text).not.toContain('<')
    expect(running.result.text).not.toContain('#')
  })

  it('returns stable mobile empty states and refreshed timer data', async () => {
    const dashboard = await json<
      RpcOk<{
        title: string
        timerStatus: string
        todayDurationLabel: string
        todayEntriesLabel: string
      }>
    >(await app.fetch(rpc('time-tracker.native.read', { view: 'dashboard' })))
    expect(dashboard.result).toMatchObject({
      title: 'Ready when you are',
      timerStatus: 'Stopped',
      todayDurationLabel: '0s',
      todayEntriesLabel: '0',
      timer: {
        running: false,
        accumulatedSeconds: 0,
        canStart: true,
      },
    })

    const emptyEntries = await json<
      RpcOk<{ entries: unknown[]; emptyStates: Array<{ title: string }> }>
    >(
      await app.fetch(
        rpc('time-tracker.native.read', { view: 'entries', limit: 20 }),
      ),
    )
    expect(emptyEntries.result.entries).toEqual([])
    expect(emptyEntries.result.emptyStates[0]?.title).toBe(
      'No tracked time yet',
    )

    await app.fetch(
      rpc('time-tracker.timer.start', {
        projectName: 'Native QA',
        description: 'Verify refreshed state',
      }),
    )
    const timer = await json<
      RpcOk<{
        timers: Array<{ isRunning: boolean; projectName: string }>
        emptyStates: unknown[]
      }>
    >(await app.fetch(rpc('time-tracker.native.read', { view: 'timer' })))
    expect(timer.result.emptyStates).toEqual([])
    expect(timer.result.timers).toEqual([
      expect.objectContaining({
        isRunning: true,
        projectName: 'Native QA',
      }),
    ])
  })

  it('starts a native timer only for an active project and never overwrites a running timer', async () => {
    const missing = await app.fetch(
      rpc('time-tracker.timer.startByProjectId', { projectId: 'missing' }),
    )
    expect(missing.status).toBe(404)

    const created = await json<RpcOk<Project>>(
      await app.fetch(
        rpc('time-tracker.projects.create', {
          name: 'Native timer QA',
          color: '#6366f1',
        }),
      ),
    )
    const started = await app.fetch(
      rpc('time-tracker.timer.startByProjectId', {
        projectId: created.result.id,
        description: 'Safe native start',
      }),
    )
    expect(started.ok).toBe(true)

    const overwrite = await app.fetch(
      rpc('time-tracker.timer.startByProjectId', {
        projectId: created.result.id,
        description: 'Must not replace the active timer',
      }),
    )
    expect(overwrite.status).toBe(409)

    const timer = await json<RpcOk<TimerState>>(
      await app.fetch(rpc('time-tracker.timer.get')),
    )
    expect(timer.result.description).toBe('Safe native start')
  })

  it('projects and mutates disposable native projects and entries safely', async () => {
    const project = await json<RpcOk<Project>>(
      await app.fetch(
        rpc('time-tracker.projects.create', {
          name: 'Disposable native project',
          color: '#6366f1',
        }),
      ),
    )
    const projectDetail = await json<
      RpcOk<{
        id: string
        nameDraft: string
        colorDraft: string
        statusLabel: string
      }>
    >(
      await app.fetch(
        rpc('time-tracker.native.read', {
          view: 'project',
          projectId: project.result.id,
        }),
      ),
    )
    expect(projectDetail.result).toMatchObject({
      id: project.result.id,
      nameDraft: 'Disposable native project',
      colorDraft: '#6366f1',
      statusLabel: 'Active',
    })

    const updatedProject = await json<RpcOk<Project>>(
      await app.fetch(
        rpc('time-tracker.projects.update', {
          id: project.result.id,
          name: 'Updated disposable project',
        }),
      ),
    )
    expect(updatedProject.result.name).toBe('Updated disposable project')

    const entry = await json<RpcOk<TimeEntry>>(
      await app.fetch(
        rpc('time-tracker.entries.create', {
          projectId: project.result.id,
          description: 'Disposable native entry',
          startTime: '2026-08-03T13:00:00.000Z',
          endTime: '2026-08-03T14:00:00.000Z',
        }),
      ),
    )
    const entryDetail = await json<
      RpcOk<{
        id: string
        descriptionDraft: string
        startTimeDraft: string
        endTimeDraft: string
      }>
    >(
      await app.fetch(
        rpc('time-tracker.native.read', {
          view: 'entry',
          entryId: entry.result.id,
        }),
      ),
    )
    expect(entryDetail.result).toMatchObject({
      id: entry.result.id,
      descriptionDraft: 'Disposable native entry',
      startTimeDraft: '2026-08-03T13:00:00.000Z',
      endTimeDraft: '2026-08-03T14:00:00.000Z',
    })

    const invalidUpdate = await app.fetch(
      rpc('time-tracker.entries.update', {
        id: entry.result.id,
        startTime: '2026-08-03T15:00:00.000Z',
        endTime: '2026-08-03T14:00:00.000Z',
      }),
    )
    expect(invalidUpdate.status).toBe(400)

    const updatedEntry = await json<RpcOk<TimeEntry>>(
      await app.fetch(
        rpc('time-tracker.entries.update', {
          id: entry.result.id,
          description: 'Updated native entry',
        }),
      ),
    )
    expect(updatedEntry.result.description).toBe('Updated native entry')

    expect(
      (
        await json<RpcOk<{ deleted: boolean }>>(
          await app.fetch(
            rpc('time-tracker.entries.delete', { id: entry.result.id }),
          ),
        )
      ).result.deleted,
    ).toBe(true)

    const archived = await json<RpcOk<Project>>(
      await app.fetch(
        rpc('time-tracker.projects.update', {
          id: project.result.id,
          archived: true,
        }),
      ),
    )
    expect(archived.result.archived).toBe(true)
  })

  it('projects live timer anchors, real period summaries, palettes, and archived projects', async () => {
    const project = await json<RpcOk<Project>>(
      await app.fetch(
        rpc('time-tracker.projects.create', {
          name: 'Native summary QA',
          color: '#3b82f6',
        }),
      ),
    )
    const end = new Date()
    const start = new Date(end.getTime() - 60 * 60 * 1000)
    await app.fetch(
      rpc('time-tracker.entries.create', {
        projectId: project.result.id,
        description: 'Current week projection',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    )

    const dashboard = await json<
      RpcOk<{
        serverNow: string
        timer: { anchor: string; running: boolean }
        weekDurationLabel: string
      }>
    >(await app.fetch(rpc('time-tracker.native.read', { view: 'dashboard' })))
    expect(dashboard.result.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(dashboard.result.timer).toMatchObject({ running: false })
    expect(dashboard.result.timer.anchor).toBe(dashboard.result.serverNow)
    expect(dashboard.result.weekDurationLabel).toBe('1h 0m')

    const summary = await json<
      RpcOk<{
        today: { totalHoursLabel: string }
        week: { totalHoursLabel: string; periodLabel: string }
        allTime: { totalHoursLabel: string }
      }>
    >(await app.fetch(rpc('time-tracker.native.read', { view: 'summary' })))
    expect(summary.result.today.totalHoursLabel).toBe('1h 0m')
    expect(summary.result.week.totalHoursLabel).toBe('1h 0m')
    expect(summary.result.week.periodLabel).toContain('–')
    expect(summary.result.allTime.totalHoursLabel).toBe('1h 0m')

    const draft = await json<
      RpcOk<{
        draft: { color: string }
        palette: Array<{ label: string; value: string }>
      }>
    >(
      await app.fetch(
        rpc('time-tracker.native.read', { view: 'project-draft' }),
      ),
    )
    expect(draft.result.draft.color).toBe('#3b82f6')
    expect(draft.result.palette.map((color) => color.label)).toEqual([
      'Blue',
      'Violet',
      'Green',
      'Orange',
      'Red',
    ])

    await app.fetch(
      rpc('time-tracker.projects.update', {
        id: project.result.id,
        archived: true,
      }),
    )
    const archived = await json<RpcOk<{ projects: Project[] }>>(
      await app.fetch(
        rpc('time-tracker.native.read', { view: 'archived-projects' }),
      ),
    )
    expect(archived.result.projects).toEqual([
      expect.objectContaining({ id: project.result.id, archived: true }),
    ])
  })

  it('keeps intents isolated per workspace', async () => {
    await app.fetch(
      rpc('time-tracker.ui.navigate', { view: 'projects' }, 'workspace-a'),
    )

    const other = await json<unknown>(
      await app.fetch(request('/api/moldable/ui-intent', {}, 'workspace-b')),
    )
    expect(other).toBeNull()
  })
})
