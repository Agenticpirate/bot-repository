import { ensureDir, getAppDataDir, writeJson } from '@moldable-ai/storage'
import type { WeatherData } from '../lib/types'
import { app } from './app'
import {
  projectNativeLocationSearch,
  projectNativeWeather,
} from './native-ui-api'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

function weatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    unit: 'celsius',
    location: {
      latitude: 43.6532,
      longitude: -79.3832,
      name: 'Toronto',
      region: 'Ontario',
      country: 'Canada',
      timezone: 'America/Toronto',
    },
    current: {
      temperature: 24,
      apparentTemperature: 26,
      code: 2,
      label: 'Partly cloudy',
      isDay: true,
      humidity: 63,
      windSpeed: 9,
      time: '2026-08-02T12:00',
    },
    hourly: Array.from({ length: 20 }, (_, index) => ({
      time: `2099-08-02T${String((13 + index) % 24).padStart(2, '0')}:00`,
      temperature: 24 + index,
      code: index % 2 === 0 ? 2 : 61,
      label: index % 2 === 0 ? 'Partly cloudy' : 'Light rain',
      isDay: index < 8,
    })),
    daily: Array.from({ length: 10 }, (_, index) => ({
      date: `2099-08-${String(2 + index).padStart(2, '0')}`,
      code: index === 0 ? 61 : 2,
      label: index === 0 ? 'Light rain' : 'Partly cloudy',
      high: 27 + index,
      low: 18 + index,
      precipitationProbability: index === 0 ? 70 : 10,
    })),
    updatedAt: '2026-08-02T18:10:00.000Z',
    ...overrides,
  }
}

test('native weather overview faithfully formats live conditions', () => {
  const result = projectNativeWeather(weatherData(), 'overview', {
    hasCustomLocation: true,
  })

  assert.deepEqual(result, {
    place: 'Toronto, Ontario, Canada',
    sourceLabel: 'Saved location',
    temperatureValue: '24°',
    conditionLabel: '🌤️ Partly cloudy',
    feelsLikeLabel: 'Feels like 26° · Celsius',
    humidityValue: '63%',
    windValue: '9 mph',
    precipitationLabel: '70% precipitation chance',
    todayTemperatureRange: '18° – 27°',
    notableForecasts: [
      {
        title: 'Rain is likely',
        message: '70% chance of precipitation today.',
      },
    ],
    updatedLabel: result.updatedLabel,
  })
  assert.match(result.updatedLabel, /^Updated .+ · Open-Meteo$/)
})

test('native weather location search projects bounded labels and no-match state', () => {
  const empty = projectNativeLocationSearch([])
  assert.equal(empty.results.length, 0)
  assert.deepEqual(empty.emptyStates, [
    {
      title: 'No matching locations',
      description: 'Try a city, region, or nearby place name.',
    },
  ])

  const matched = projectNativeLocationSearch([
    {
      id: 1,
      name: 'Toronto',
      subtitle: 'Ontario, Canada',
      latitude: 43.6532,
      longitude: -79.3832,
      region: 'Ontario',
      country: 'Canada',
      timezone: 'America/Toronto',
    },
  ])
  assert.equal(matched.emptyStates.length, 0)
  assert.equal(matched.results[0]?.displayLabel, 'Use Toronto for weather')
})

test('native weather routes remain bounded and expose honest empty states', () => {
  const hourly = projectNativeWeather(weatherData(), 'hourly', {
    hasCustomLocation: false,
  })
  const daily = projectNativeWeather(weatherData(), 'daily', {
    hasCustomLocation: false,
  })
  assert.equal('hourly' in hourly && hourly.hourly?.length, 12)
  assert.equal('daily' in daily && daily.daily?.length, 7)

  const empty = weatherData({ hourly: [], daily: [] })
  const emptyHourly = projectNativeWeather(empty, 'hourly', {
    hasCustomLocation: false,
  })
  const emptyDaily = projectNativeWeather(empty, 'daily', {
    hasCustomLocation: false,
  })
  assert.equal(
    'emptyStates' in emptyHourly && emptyHourly.emptyStates?.length,
    1,
  )
  assert.equal('emptyStates' in emptyDaily && emptyDaily.emptyStates?.length, 1)
})

test('native weather RPC reads the workspace location and returns a route projection', async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'weather-native-'))
  const originalFetch = globalThis.fetch
  const previousHome = process.env.MOLDABLE_HOME
  const workspace = `native-${Date.now()}`
  const headers = {
    'x-moldable-workspace': workspace,
    'content-type': 'application/json',
  }
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'weather'

  let forecastCalls = 0
  globalThis.fetch = (async () => {
    forecastCalls += 1
    return new Response(
      JSON.stringify({
        utc_offset_seconds: 0,
        current: {
          time: '2026-08-02T12:00',
          temperature_2m: 24,
          apparent_temperature: 26,
          relative_humidity_2m: 63,
          weather_code: 2,
          is_day: 1,
          wind_speed_10m: 9,
        },
        hourly: {
          time: ['2099-08-02T13:00'],
          temperature_2m: [25],
          weather_code: [2],
          is_day: [1],
        },
        daily: {
          time: ['2099-08-02'],
          weather_code: [61],
          temperature_2m_max: [27],
          temperature_2m_min: [18],
          precipitation_probability_max: [70],
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const save = await app.request('/api/location', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        latitude: 43.6532,
        longitude: -79.3832,
        name: 'Toronto',
        region: 'Ontario',
        country: 'Canada',
        timezone: 'America/Toronto',
      }),
    })
    assert.equal(save.status, 200)

    const response = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'weather.native.read',
        params: { route: 'overview' },
      }),
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      ok: boolean
      result: Record<string, unknown>
    }
    assert.equal(body.ok, true)
    assert.equal(body.result.place, 'Toronto, Ontario, Canada')
    assert.equal(body.result.sourceLabel, 'Saved location')
    assert.equal(body.result.temperatureValue, '24°')
    assert.equal('current' in body.result, false)
    assert.equal('location' in body.result, false)
    assert.equal(forecastCalls, 1)

    const refresh = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'weather.native.refresh',
        params: {},
      }),
    })
    assert.equal(refresh.status, 200)
    assert.equal(forecastCalls, 2, 'explicit refresh must bypass a fresh cache')
    assert.match(JSON.stringify(await refresh.json()), /Weather refreshed/)

    const invalid = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'weather.native.read',
        params: { route: 'hourly', extra: true },
      }),
    })
    assert.equal(invalid.status, 400)
  } finally {
    globalThis.fetch = originalFetch
    if (previousHome === undefined) delete process.env.MOLDABLE_HOME
    else process.env.MOLDABLE_HOME = previousHome
    await fs.rm(tempHome, { recursive: true, force: true })
  }
})

test('native weather RPC renders a persisted fresh forecast without waiting on the network', async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'weather-cache-'))
  const originalFetch = globalThis.fetch
  const previousHome = process.env.MOLDABLE_HOME
  const workspace = `cached-native-${Date.now()}`
  const headers = {
    'x-moldable-workspace': workspace,
    'content-type': 'application/json',
  }
  const location = {
    latitude: 43.6532,
    longitude: -79.3832,
    name: 'Toronto',
    region: 'Ontario',
    country: 'Canada',
    timezone: 'America/Toronto',
  }
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'weather'

  try {
    const save = await app.request('/api/location', {
      method: 'POST',
      headers,
      body: JSON.stringify(location),
    })
    assert.equal(save.status, 200)

    const value = weatherData({ unit: 'fahrenheit', location })
    const key = [
      workspace,
      'fahrenheit',
      location.latitude.toFixed(5),
      location.longitude.toFixed(5),
      location.name,
      location.region,
      location.country,
      location.timezone,
    ].join('|')
    await ensureDir(getAppDataDir(workspace))
    await writeJson(path.join(getAppDataDir(workspace), 'weather-cache.json'), {
      version: 1,
      key,
      value,
      at: Date.now(),
    })

    globalThis.fetch = (async () => {
      throw new Error('fresh persisted weather should not fetch')
    }) as typeof fetch
    const response = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'weather.native.read',
        params: { route: 'overview' },
      }),
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      ok: boolean
      result: Record<string, unknown>
    }
    assert.equal(body.ok, true)
    assert.equal(body.result.place, 'Toronto, Ontario, Canada')
  } finally {
    globalThis.fetch = originalFetch
    if (previousHome === undefined) delete process.env.MOLDABLE_HOME
    else process.env.MOLDABLE_HOME = previousHome
    await fs.rm(tempHome, { recursive: true, force: true })
  }
})

test('native weather location search, save, and reset stay bounded in temporary storage', async () => {
  const tempHome = await fs.mkdtemp(
    path.join(os.tmpdir(), 'weather-location-native-'),
  )
  const originalFetch = globalThis.fetch
  const previousHome = process.env.MOLDABLE_HOME
  const previousAppId = process.env.MOLDABLE_APP_ID
  const workspace = `location-native-${Date.now()}`
  const headers = {
    'x-moldable-workspace': workspace,
    'content-type': 'application/json',
  }
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'weather'

  globalThis.fetch = (async (input) => {
    assert.match(String(input), /geocoding-api\.open-meteo\.com/)
    return new Response(
      JSON.stringify({
        results: Array.from({ length: 10 }, (_, index) => ({
          id: index + 1,
          name: index === 0 ? 'Toronto' : `Toronto ${index + 1}`,
          latitude: 43.6532 + index / 100,
          longitude: -79.3832,
          country: 'Canada',
          admin1: 'Ontario',
          timezone: 'America/Toronto',
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  const rpc = (method: string, params: unknown) =>
    app.request('/api/moldable/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, params }),
    })

  try {
    const search = await rpc('weather.native.searchLocations', {
      query: 'Toronto',
    })
    assert.equal(search.status, 200)
    const searchBody = (await search.json()) as {
      result: {
        results: Array<{ name: string; latitude: number; longitude: number }>
        emptyStates: Array<unknown>
      }
    }
    assert.equal(searchBody.result.results.length, 8)
    assert.equal(searchBody.result.emptyStates.length, 0)
    assert.equal(searchBody.result.results[0]?.name, 'Toronto')

    const selected = searchBody.result.results[0]!
    const save = await rpc('weather.native.location.update', {
      action: 'set',
      latitude: selected.latitude,
      longitude: selected.longitude,
      name: selected.name,
      region: 'Ontario',
      country: 'Canada',
      timezone: 'America/Toronto',
    })
    assert.equal(save.status, 200)
    assert.match(JSON.stringify(await save.json()), /Location updated/)

    const saved = await app.request('/api/location', { headers })
    assert.deepEqual(await saved.json(), {
      mode: 'custom',
      location: {
        latitude: selected.latitude,
        longitude: selected.longitude,
        name: 'Toronto',
        region: 'Ontario',
        country: 'Canada',
        timezone: 'America/Toronto',
      },
    })

    const reset = await rpc('weather.native.location.update', {
      action: 'use-ip',
    })
    assert.equal(reset.status, 200)
    assert.match(JSON.stringify(await reset.json()), /approximate location/i)
    const afterReset = await app.request('/api/location', { headers })
    assert.deepEqual(await afterReset.json(), { mode: 'ip', location: null })

    assert.equal(
      (await rpc('weather.native.searchLocations', { query: 'x' })).status,
      400,
    )
  } finally {
    globalThis.fetch = originalFetch
    if (previousHome === undefined) delete process.env.MOLDABLE_HOME
    else process.env.MOLDABLE_HOME = previousHome
    if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
    else process.env.MOLDABLE_APP_ID = previousAppId
    await fs.rm(tempHome, { recursive: true, force: true })
  }
})

test('uses mobile web without a per-app NativeUI package', async () => {
  const { readFile, access } = await import('node:fs/promises')
  const manifest = JSON.parse(
    await readFile(new URL('../../moldable.json', import.meta.url), 'utf8'),
  ) as {
    nativeUI?: string
    mobile?: { type: string }
  }
  assert.equal(manifest.nativeUI, undefined)
  assert.equal(manifest.mobile?.type, 'mobile-web')
  await assert.rejects(access(new URL('../../native-ui.json', import.meta.url)))
})
