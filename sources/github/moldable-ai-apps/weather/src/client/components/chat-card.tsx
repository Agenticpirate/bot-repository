import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { WeatherData } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { formatDay, formatHour } from '../weather-utils'
import { WeatherIcon, weatherToneClass } from './weather-icon'

type CardData = WeatherData
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('weather', 'weather.cards.read'),
    refetchInterval: 30_000,
  })
  const data = query.data
  const open = () => {
    setError(undefined)
    void openQuickLook().catch((error) => setError(String(error)))
  }
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {data && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border hover:bg-muted/40 focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
              onClick={open}
            >
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {data.location.name ||
                      `${data.location.latitude.toFixed(2)}, ${data.location.longitude.toFixed(2)}`}
                  </p>
                  <p className="my-1 text-4xl font-light tracking-tight">
                    {Math.round(data.current.temperature)}°
                    <span className="text-muted-foreground ml-1 text-sm">
                      {data.unit === 'celsius' ? 'C' : 'F'}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {data.current.label}
                  </p>
                </div>
                <WeatherIcon
                  code={data.current.code}
                  isDay={data.current.isDay}
                  className={`size-14 ${weatherToneClass(data.current.code, data.current.isDay)}`}
                />
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-6 p-5">
              <div>
                <h1 className="text-xl font-semibold">
                  {data.location.name || 'Forecast'}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {data.current.label} · Feels like{' '}
                  {data.current.apparentTemperature}°
                  {data.unit === 'celsius' ? 'C' : 'F'}
                </p>
              </div>
              <section>
                <h2 className="mb-3 text-sm font-semibold">Hourly</h2>
                <ul className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-2">
                  {data.hourly.slice(0, 24).map((hour) => (
                    <li
                      key={hour.time}
                      className="bg-muted/40 flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-xl p-3 text-sm"
                    >
                      <time className="text-muted-foreground text-xs">
                        {formatHour(hour.time)}
                      </time>
                      <WeatherIcon
                        code={hour.code}
                        isDay={hour.isDay}
                        className={`size-6 ${weatherToneClass(hour.code, hour.isDay)}`}
                      />
                      <span>{hour.temperature}°</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="mb-2 text-sm font-semibold">Daily</h2>
                <ul className="divide-border divide-y">
                  {data.daily.map((day, index) => (
                    <li
                      key={day.date}
                      className="flex items-center gap-3 py-3 text-sm"
                    >
                      <time className="w-12">{formatDay(day.date, index)}</time>
                      <WeatherIcon
                        code={day.code}
                        className={`size-5 ${weatherToneClass(day.code)}`}
                      />
                      <span className="text-muted-foreground min-w-0 flex-1 text-xs">
                        {day.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {day.precipitationProbability}%
                      </span>
                      <span className="text-muted-foreground">{day.low}°</span>
                      <span>{day.high}°</span>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="text-muted-foreground text-xs">
                Humidity {data.current.humidity}% · Wind{' '}
                {data.current.windSpeed} mph · Updated{' '}
                {new Date(data.updatedAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </article>
          )}
        </>
      )}
    </div>
  )
}
