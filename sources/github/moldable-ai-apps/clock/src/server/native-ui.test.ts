import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let tempHome = ''
let app: typeof import('./app').app

const headers = {
  'content-type': 'application/json',
  'x-moldable-workspace': 'native-ui-test',
}

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ method, params }),
  })
  return {
    response,
    body: (await response.json()) as { result: Record<string, unknown> },
  }
}

describe('Clock NativeUI projections', () => {
  beforeAll(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'clock-native-ui-'))
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'clock'
    ;({ app } = await import('./app'))
  })

  afterAll(async () => {
    await fs.rm(tempHome, { recursive: true, force: true })
  })

  it('returns display-safe timer and alarm rows with state-specific actions', async () => {
    const started = await rpc('clock.timers.start', {
      minutes: 5,
      label: 'Tea',
    })
    expect(started.response.status).toBe(200)
    const timerId = String(started.body.result.id)

    const timers = await rpc('clock.ui.read', { view: 'timers' })
    expect(timers.response.status).toBe(200)
    expect(timers.body.result.timers).toEqual([
      expect.objectContaining({
        label: 'Tea',
        durationLabel: '5:00',
        currentRemainingLabel: expect.stringMatching(/^(4:59|5:00)$/),
        countdownAnchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        stateLabel: 'Running',
        canPause: true,
        canResume: false,
        pauseActions: [expect.objectContaining({ label: 'Pause timer' })],
        resumeActions: [],
      }),
    ])

    const renamed = await rpc('clock.timers.update', {
      id: timerId,
      label: 'Green tea',
    })
    expect(renamed.response.status).toBe(200)
    expect(renamed.body.result).toEqual(
      expect.objectContaining({
        id: timerId,
        label: 'Green tea',
        durationMs: 300_000,
        running: true,
      }),
    )

    const createdAlarm = await rpc('clock.alarms.create', {
      time: '07:00',
      label: 'Wake up',
      enabled: true,
    })
    const alarmId = String(createdAlarm.body.result.id)
    const alarms = await rpc('clock.ui.read', { view: 'alarms' })
    expect(alarms.response.status).toBe(200)
    expect(alarms.body.result.alarms).toEqual([
      expect.objectContaining({
        label: 'Wake up',
        repeatLabel: 'Once',
        enabledLabel: 'On',
        alarmName: 'Wake up at 07:00',
        nextAlarmCountdowns: [
          expect.objectContaining({
            anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        ],
        draft: expect.objectContaining({ id: alarmId, time: '07:00' }),
        enableActions: [],
        disableActions: [expect.objectContaining({ label: 'Turn off' })],
      }),
    ])

    const editedAlarm = await rpc('clock.alarms.update', {
      id: alarmId,
      time: '07:30',
      label: 'Weekday alarm',
    })
    expect(editedAlarm.response.status).toBe(200)
    expect(editedAlarm.body.result).toEqual(
      expect.objectContaining({
        id: alarmId,
        time: '07:30',
        label: 'Weekday alarm',
      }),
    )

    const home = await rpc('clock.ui.read')
    expect(home.body.result).toEqual(
      expect.objectContaining({
        serverNow: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        timers: [expect.objectContaining({ id: timerId })],
        alarms: [expect.objectContaining({ id: alarmId })],
        stopwatch: expect.objectContaining({ accumulatedSeconds: 0 }),
      }),
    )

    expect(
      (await rpc('clock.timers.delete', { id: timerId })).response.status,
    ).toBe(200)
    expect(
      (await rpc('clock.alarms.delete', { id: alarmId })).response.status,
    ).toBe(200)

    const emptyTimers = await rpc('clock.ui.read', { view: 'timers' })
    const emptyAlarms = await rpc('clock.ui.read', { view: 'alarms' })
    expect(emptyTimers.body.result.timers).toEqual([])
    expect(emptyAlarms.body.result.alarms).toEqual([])
  })

  it('manages world clocks and the stopwatch through the authoritative RPC surface', async () => {
    const search = await rpc('clock.worldclocks.search', {
      query: 'Toronto',
      limit: 10,
    })
    expect(search.response.status).toBe(200)
    expect(search.body.result.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ timeZone: 'America/Toronto' }),
      ]),
    )

    const created = await rpc('clock.worldclocks.create', {
      timeZone: 'America/Toronto',
      label: 'Toronto',
    })
    expect(created.response.status).toBe(200)
    const worldClockId = String(created.body.result.id)
    const worldClockView = await rpc('clock.ui.read', { view: 'worldclock' })
    expect(worldClockView.body.result.worldClocks).toEqual([
      expect.objectContaining({ id: worldClockId, label: 'Toronto' }),
    ])

    expect((await rpc('clock.stopwatch.start')).response.status).toBe(200)
    expect((await rpc('clock.stopwatch.lap')).response.status).toBe(200)
    const runningStopwatch = await rpc('clock.ui.read', { view: 'stopwatch' })
    expect(runningStopwatch.body.result.stopwatch).toEqual(
      expect.objectContaining({
        anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        accumulatedSeconds: 0,
        runningLabel: 'Running',
        canStop: true,
        stopActions: [{ label: 'Stop' }],
        lapActions: [{ label: 'Lap' }],
        lapRows: [
          expect.objectContaining({
            title: 'Lap 1',
            subtitle: expect.stringContaining('Total'),
            tone: 'neutral',
          }),
        ],
      }),
    )
    expect((await rpc('clock.stopwatch.stop')).response.status).toBe(200)
    expect((await rpc('clock.stopwatch.reset')).response.status).toBe(200)
    expect(
      (await rpc('clock.worldclocks.delete', { id: worldClockId })).response
        .status,
    ).toBe(200)
  })

  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(new URL('../../moldable.json', import.meta.url), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(new URL('../../native-ui.json', import.meta.url)),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
