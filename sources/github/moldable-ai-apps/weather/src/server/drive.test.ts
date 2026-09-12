import { app } from './app'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const workspace = 'drive-test'
const headers = {
  'x-moldable-workspace': workspace,
  'content-type': 'application/json',
}

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ method, params }),
  })
}

test('Weather drive contract', async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'weather-drive-'))
  const originalFetch = globalThis.fetch
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'weather'
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        utc_offset_seconds: 0,
        current: {
          time: '2026-07-27T12:00',
          temperature_2m: 24,
          apparent_temperature: 25,
          relative_humidity_2m: 55,
          weather_code: 1,
          is_day: 1,
          wind_speed_10m: 8,
        },
        hourly: {
          time: ['2099-07-27T13:00'],
          temperature_2m: [25],
          weather_code: [1],
          is_day: [1],
        },
        daily: {
          time: ['2099-07-27'],
          weather_code: [1],
          temperature_2m_max: [27],
          temperature_2m_min: [18],
          precipitation_probability_max: [10],
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch

  try {
    const described = (await (await rpc('weather.ui.describe')).json()) as {
      result: { views: Array<{ id: string }> }
    }
    assert.deepEqual(
      described.result.views.map((view) => view.id),
      ['current', 'hourly', 'daily'],
    )

    const navigated = (await (
      await rpc('weather.ui.navigate', { view: 'daily' })
    ).json()) as { result: { intentId: string } }
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers })
    ).json()) as { id: string; view: string }
    assert.equal(intent.id, navigated.result.intentId)
    assert.equal(intent.view, 'daily')

    const read = (await (
      await rpc('weather.ui.read', {
        view: 'daily',
        lat: 43.65,
        lon: -79.38,
        unit: 'celsius',
      })
    ).json()) as {
      result: { current: { temperature: number }; daily: unknown[] }
    }
    assert.equal(read.result.current.temperature, 24)
    assert.equal(read.result.daily.length, 1)

    const deleted = await app.request(
      `/api/moldable/ui-intent?id=${intent.id}`,
      { method: 'DELETE', headers },
    )
    assert.deepEqual(await deleted.json(), { ok: true, deleted: true })
    assert.equal(
      (await rpc('weather.ui.navigate', { view: 'bogus' })).status,
      400,
    )
  } finally {
    globalThis.fetch = originalFetch
    await fs.rm(tempHome, { recursive: true, force: true })
  }
})
