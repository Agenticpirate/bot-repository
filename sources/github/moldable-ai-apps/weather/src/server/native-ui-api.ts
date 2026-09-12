import type { ForecastDay, WeatherData } from '../lib/types'
import { weatherEmoji } from '../lib/wmo'
import { z } from 'zod'

export const nativeWeatherReadParamsSchema = z
  .object({
    route: z.enum(['overview', 'hourly', 'daily', 'location']),
  })
  .strict()

export type NativeWeatherRoute = z.infer<
  typeof nativeWeatherReadParamsSchema
>['route']

type NativeWeatherContext = {
  hasCustomLocation: boolean
}

function locationLabel(data: WeatherData): string {
  const label = [
    data.location.name,
    data.location.region,
    data.location.country,
  ]
    .filter(Boolean)
    .join(', ')
  return label || 'Local weather'
}

function unitLabel(data: WeatherData): string {
  return data.unit === 'celsius' ? 'Celsius' : 'Fahrenheit'
}

function formatHour(iso: string): string {
  const match = /T(\d{2})(?::\d{2})?/.exec(iso)
  const hour = match ? Number(match[1]) : Number.NaN
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return iso
  return new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', {
    hour: 'numeric',
  })
}

function formatDay(iso: string, index: number): string {
  if (index === 0) return 'Today'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return iso
  }
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function updatedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Open-Meteo weather data'
  return `Updated ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} · Open-Meteo`
}

function notableForecast(data: WeatherData, today?: ForecastDay) {
  if (!today) return []
  if (data.current.code >= 95) {
    return [
      {
        title: 'Storms expected',
        message: 'Check conditions before heading out.',
      },
    ]
  }
  if (
    today.precipitationProbability >= 50 ||
    (data.current.code >= 51 && today.precipitationProbability >= 30)
  ) {
    return [
      {
        title: 'Rain is likely',
        message: `${today.precipitationProbability}% chance of precipitation today.`,
      },
    ]
  }
  if (
    (data.unit === 'fahrenheit' && today.high >= 95) ||
    (data.unit === 'celsius' && today.high >= 35)
  ) {
    return [
      {
        title: 'Heat today',
        message: 'Take breaks and stay hydrated.',
      },
    ]
  }
  if (
    (data.unit === 'fahrenheit' && today.low <= 32) ||
    (data.unit === 'celsius' && today.low <= 0)
  ) {
    return [
      {
        title: 'Freezing temperatures',
        message: 'Bundle up before heading out.',
      },
    ]
  }
  return []
}

export function projectNativeWeather(
  data: WeatherData,
  route: NativeWeatherRoute,
  context: NativeWeatherContext,
) {
  const place = locationLabel(data)
  const sourceLabel = context.hasCustomLocation
    ? 'Saved location'
    : 'Approximate IP location'
  const today = data.daily[0]

  if (route === 'overview') {
    return {
      place,
      sourceLabel,
      temperatureValue: `${data.current.temperature}°`,
      conditionLabel: `${weatherEmoji(data.current.code, data.current.isDay)} ${data.current.label}`,
      feelsLikeLabel: `Feels like ${data.current.apparentTemperature}° · ${unitLabel(data)}`,
      humidityValue: `${data.current.humidity}%`,
      windValue: `${data.current.windSpeed} mph`,
      precipitationLabel: today
        ? `${today.precipitationProbability}% precipitation chance`
        : 'Precipitation forecast unavailable',
      todayTemperatureRange: today
        ? `${today.low}° – ${today.high}°`
        : 'Unavailable',
      notableForecasts: notableForecast(data, today),
      updatedLabel: updatedLabel(data.updatedAt),
    }
  }

  if (route === 'hourly') {
    const hourly = data.hourly.slice(0, 12).map((hour) => ({
      timeLabel: formatHour(hour.time),
      temperatureLabel: `${hour.temperature}°`,
      conditionLabel: hour.label,
    }))
    return {
      place,
      unitLabel: unitLabel(data),
      countLabel: `${hourly.length} hours`,
      hourly,
      emptyStates:
        hourly.length === 0
          ? [
              {
                title: 'Hourly forecast unavailable',
                description:
                  'Current conditions loaded, but Open-Meteo did not return upcoming hourly data.',
              },
            ]
          : [],
      updatedLabel: updatedLabel(data.updatedAt),
    }
  }

  if (route === 'daily') {
    const daily = data.daily.slice(0, 7).map((day, index) => ({
      dayLabel: formatDay(day.date, index),
      conditionLabel: day.label,
      precipitationLabel:
        day.precipitationProbability > 0
          ? `${day.precipitationProbability}% rain`
          : '',
      temperatureLabel: `${day.low}° / ${day.high}°`,
    }))
    return {
      place,
      unitLabel: unitLabel(data),
      countLabel: `${daily.length}-day forecast`,
      daily,
      emptyStates:
        daily.length === 0
          ? [
              {
                title: 'Daily forecast unavailable',
                description:
                  'Current conditions loaded, but Open-Meteo did not return daily forecast data.',
              },
            ]
          : [],
      updatedLabel: updatedLabel(data.updatedAt),
    }
  }

  return {
    place,
    sourceLabel,
    draftQuery: '',
    locationResetActions: context.hasCustomLocation
      ? [{ label: 'Use approximate location' }]
      : [],
    sourceNotices: [
      context.hasCustomLocation
        ? {
            title: 'Using your saved location',
            message:
              'This is the same workspace location selected in the desktop Weather app.',
          }
        : {
            title: 'Using an approximate location',
            message:
              "Weather resolved this place from the desktop connection's IP address.",
          },
    ],
    details: [
      { label: 'Place', value: data.location.name ?? 'Not provided' },
      { label: 'Region', value: data.location.region ?? 'Not provided' },
      { label: 'Country', value: data.location.country ?? 'Not provided' },
      { label: 'Timezone', value: data.location.timezone ?? 'Not provided' },
      { label: 'Latitude', value: data.location.latitude.toFixed(4) },
      { label: 'Longitude', value: data.location.longitude.toFixed(4) },
    ],
  }
}

export function projectNativeLocationSearch(
  results: Array<{
    id: string | number
    name: string
    subtitle: string
    latitude: number
    longitude: number
    region: string | null
    country: string | null
    timezone: string | null
  }>,
) {
  return {
    results: results.map((result) => ({
      ...result,
      displayLabel: `Use ${result.name} for weather`,
    })),
    emptyStates:
      results.length === 0
        ? [
            {
              title: 'No matching locations',
              description: 'Try a city, region, or nearby place name.',
            },
          ]
        : [],
  }
}
