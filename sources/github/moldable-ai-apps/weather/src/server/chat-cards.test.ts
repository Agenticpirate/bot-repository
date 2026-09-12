import { app } from './app'
import { setLocationPreference } from './weather'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('freezes the resolved location and unit in a weather card', async () => {
  const originalEnv = { ...process.env }
  const temporaryHome = await mkdtemp(join(tmpdir(), 'weather-card-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'weather'
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        current: {
          time: '2099-01-01T10:00',
          temperature_2m: 20,
          apparent_temperature: 19,
          weather_code: 0,
          is_day: 1,
          relative_humidity_2m: 50,
          wind_speed_10m: 3,
        },
        hourly: { time: [] },
        daily: { time: [] },
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  const rpc = async (method: string, params: Record<string, unknown>) =>
    (
      await app.request('/api/moldable/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-moldable-workspace': 'cards-test',
        },
        body: JSON.stringify({ method, params }),
      })
    ).json()
  try {
    await setLocationPreference('cards-test', {
      name: 'Montreal',
      latitude: 45.5,
      longitude: -73.6,
    })
    const card = (await rpc('weather.cards.present', { unit: 'celsius' }))
      .result.appCard
    assert.equal(card.input.lat, 45.5)
    assert.equal(card.input.unit, 'celsius')
    assert.equal(card.input.locationName, 'Montreal')
    await setLocationPreference('cards-test', {
      name: 'Elsewhere',
      latitude: 0,
      longitude: 0,
    })
    const read = (await rpc(card.readMethod, card.input)).result
    assert.equal(read.location.latitude, 45.5)
    assert.equal(read.location.name, 'Montreal')
    assert.equal((await rpc('weather.cards.present', { lat: 45 })).ok, false)
  } finally {
    globalThis.fetch = originalFetch
    process.env = originalEnv
    await rm(temporaryHome, { recursive: true, force: true })
  }
})
