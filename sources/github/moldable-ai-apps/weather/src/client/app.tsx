import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Cloud,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Wind,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppFrameContent,
  AppHeader,
  AppShell,
  Button,
  DesktopOnly,
  SearchField,
  Skeleton,
  Toolbar,
  ToolbarButton,
  ToolbarIconButton,
  useWorkspace,
} from '@moldable-ai/ui'
import type {
  LocationSearchResult,
  Unit,
  WeatherData,
  WeatherLocation,
  WeatherUiIntent,
} from '../lib/types'
import { AnimatedNumber } from './components/animated-number'
import { WeatherIcon, weatherToneClass } from './components/weather-icon'
import { formatDay, formatHour, readWeatherUrlParams } from './weather-utils'
import {
  AnimatePresence,
  type Variants,
  motion,
  useReducedMotion,
} from 'framer-motion'

// House easing (shared with the Affirmations app) — a soft, confident ease-out.
const EASE = [0.22, 1, 0.36, 1] as const

// Vertical cascade for the three weather cards: each section eases up + fades in,
// staggered so the eye travels current → hourly → 7-day, like Piano's reveal.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

// Container that staggers its direct children (cards, hourly chips, daily rows).
function staggerContainer(stagger: number, delay = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }
}

// Small items (hourly chips, daily rows) pop in subtly within their container.
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
}

function formatLocation(location?: WeatherLocation | null): string {
  if (!location) return ''
  return [location.name, location.region, location.country]
    .filter(Boolean)
    .join(', ')
}

interface LocationPreference {
  mode: 'custom' | 'ip'
  location: WeatherLocation | null
}

interface LocationSearchResponse {
  results: LocationSearchResult[]
}

/**
 * Optional deep-link params. Coordinates let the Today card / chat open the app
 * pinned to a specific place (e.g. `?lat=45.5&lon=-73.6`); they also skip IP
 * geolocation entirely. `unit` is accepted only as an explicit deep-link override;
 * otherwise the server uses the desktop Today weather-unit preference.
 */
function readUrlParams(): { coords: string; unitOverride: Unit | null } {
  if (typeof window === 'undefined') {
    return { coords: '', unitOverride: null }
  }
  return readWeatherUrlParams(window.location.search)
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const { coords, unitOverride } = readUrlParams()
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const seenUiIntentIds = useRef(new Set<string>())
  const [pendingUiIntent, setPendingUiIntent] =
    useState<WeatherUiIntent | null>(null)

  const weatherQueryKey = [
    'weather',
    coords,
    unitOverride ?? 'desktop',
    workspaceId,
  ]
  const locationQueryKey = ['weather-location', workspaceId]

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<WeatherData>({
      queryKey: weatherQueryKey,
      queryFn: async () => {
        const unitParam = unitOverride ? `unit=${unitOverride}` : ''
        const query = `${unitParam}${coords}`
        const res = await fetchWithWorkspace(
          `/api/weather${query ? `?${query}` : ''}`,
        )
        const body = await res.json()
        if (!res.ok) {
          throw new Error(body?.error || 'Failed to load weather')
        }
        return body as WeatherData
      },
      staleTime: 10 * 60 * 1000,
    })

  const { data: locationPreference } = useQuery<LocationPreference>({
    queryKey: locationQueryKey,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/location')
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to load location preference')
      }
      return body as LocationPreference
    },
  })

  const searchQuery = locationQuery.trim()
  const { data: locationResults, isFetching: isSearchingLocations } =
    useQuery<LocationSearchResponse>({
      queryKey: ['weather-location-search', searchQuery, workspaceId],
      queryFn: async () => {
        const res = await fetchWithWorkspace(
          `/api/locations/search?q=${encodeURIComponent(searchQuery)}`,
        )
        const body = await res.json()
        if (!res.ok) {
          throw new Error(body?.error || 'Location search failed')
        }
        return body as LocationSearchResponse
      },
      enabled: isLocationSearchOpen && searchQuery.length >= 2,
      staleTime: 5 * 60 * 1000,
    })

  const saveLocation = useMutation({
    mutationFn: async (location: WeatherLocation) => {
      const res = await fetchWithWorkspace('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Failed to save location')
      return body as LocationPreference
    },
    onSuccess: () => {
      setIsLocationSearchOpen(false)
      setLocationQuery('')
      queryClient.invalidateQueries({ queryKey: locationQueryKey })
      queryClient.invalidateQueries({ queryKey: weatherQueryKey })
    },
  })

  const clearLocation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/location', {
        method: 'DELETE',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Failed to clear location')
      return body as LocationPreference
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationQueryKey })
      queryClient.invalidateQueries({ queryKey: weatherQueryKey })
    },
  })

  const checkUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as WeatherUiIntent | null
    if (!intent || seenUiIntentIds.current.has(intent.id)) return
    setPendingUiIntent(intent)
  }, [fetchWithWorkspace])

  useEffect(() => {
    void checkUiIntent()
  }, [checkUiIntent, workspaceId])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as {
        type?: unknown
        targetAppId?: unknown
        workspaceId?: unknown
      } | null
      if (!message || message.type !== 'moldable:app-api-changed') return
      if (message.targetAppId !== 'weather') return
      if (
        typeof message.workspaceId === 'string' &&
        message.workspaceId !== workspaceId
      ) {
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['weather'] })
      void queryClient.invalidateQueries({ queryKey: ['weather-location'] })
      void checkUiIntent()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [checkUiIntent, queryClient, workspaceId])

  useEffect(() => {
    if (!pendingUiIntent || isLoading || !data) return
    const target = document.getElementById(
      `weather-view-${pendingUiIntent.view}`,
    )
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    seenUiIntentIds.current.add(pendingUiIntent.id)
    setPendingUiIntent(null)
    void fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(pendingUiIntent.id)}`,
      { method: 'DELETE' },
    )
  }, [data, fetchWithWorkspace, isLoading, pendingUiIntent])

  const degree = data?.unit === 'celsius' ? '°C' : '°F'
  const place = formatLocation(data?.location)
  const customPlace = formatLocation(locationPreference?.location)
  const isDeepLinkedLocation = coords !== ''
  const forecastLow = data ? Math.min(...data.daily.map((day) => day.low)) : 0
  const forecastHigh = data ? Math.max(...data.daily.map((day) => day.high)) : 1
  const forecastSpan = Math.max(forecastHigh - forecastLow, 1)

  // Re-key the data block on location/unit so the cascade replays when the user
  // switches cities or flips the unit — not on every background refetch.
  const motionKey = `${place}|${data?.unit ?? ''}`

  return (
    <AppShell nativeMaterial={{ background: true }} title="Weather">
      <AppHeader
        title={place || 'Weather'}
        desktop={false}
        actions={[
          ...(!isDeepLinkedLocation
            ? [
                {
                  id: 'weather.search',
                  icon: Search,
                  label: 'Search location',
                  onPress: () => setIsLocationSearchOpen((open) => !open),
                },
              ]
            : []),
          {
            id: 'weather.refresh',
            icon: RefreshCw,
            label: 'Refresh weather',
            onPress: () => void refetch(),
          },
        ]}
      />
      <DesktopOnly>
        <Toolbar
          variant="plain"
          material="none"
          position="top"
          className="justify-between gap-4"
        >
          <div>
            {place ? (
              <h2 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
                <MapPin className="size-4" />
                {place}
              </h2>
            ) : (
              <h2 className="text-xl font-semibold tracking-tight">
                Local forecast & conditions
              </h2>
            )}
            <p className="text-muted-foreground mt-1 text-sm">
              Current conditions & 7-day forecast
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isDeepLinkedLocation && (
              <ToolbarButton
                material="ultra-thin"
                type="button"
                className="cursor-pointer gap-1.5"
                onClick={() => setIsLocationSearchOpen((open) => !open)}
              >
                <Search className="size-4" />
                Location
              </ToolbarButton>
            )}
            <ToolbarIconButton
              label="Refresh weather"
              tooltip
              className="cursor-pointer"
              loading={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw />
            </ToolbarIconButton>
          </div>
        </Toolbar>
      </DesktopOnly>
      <AppFrameContent>
        <div className="mx-auto w-full max-w-2xl px-5 pb-6 pt-6 sm:px-6">
          <AnimatePresence initial={false}>
            {isLocationSearchOpen && !isDeepLinkedLocation && (
              <motion.section
                id="weather-view-current"
                key="location-panel"
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, height: 0, marginBottom: 0 }
                }
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, height: 0, marginBottom: 0 }
                }
                transition={{ duration: 0.32, ease: EASE }}
                className="border-border bg-card overflow-hidden rounded-xl border"
              >
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">Location</h3>
                      <p className="text-muted-foreground text-xs">
                        Search supported cities with Open-Meteo, or fall back to
                        IP.
                      </p>
                    </div>
                    {locationPreference?.mode === 'custom' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        disabled={clearLocation.isPending}
                        onClick={() => clearLocation.mutate()}
                      >
                        <LocateFixed className="size-4" />
                        Use IP
                      </Button>
                    )}
                  </div>

                  {customPlace && (
                    <p className="bg-muted/40 text-muted-foreground mb-3 rounded-lg px-3 py-2 text-xs">
                      Using custom location: {customPlace}
                    </p>
                  )}

                  <SearchField
                    value={locationQuery}
                    onValueChange={setLocationQuery}
                    placeholder="Search for a city…"
                    aria-label="Search for a weather location"
                  />

                  <div className="mt-3 space-y-2">
                    {searchQuery.length > 0 && searchQuery.length < 2 && (
                      <p className="text-muted-foreground px-1 text-xs">
                        Type at least 2 characters.
                      </p>
                    )}
                    {isSearchingLocations && (
                      <p className="text-muted-foreground px-1 text-xs">
                        Searching…
                      </p>
                    )}
                    {!isSearchingLocations &&
                      searchQuery.length >= 2 &&
                      locationResults?.results.length === 0 && (
                        <p className="text-muted-foreground px-1 text-xs">
                          No matching cities found.
                        </p>
                      )}
                    {locationResults?.results.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        className="hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
                        disabled={saveLocation.isPending}
                        onClick={() => saveLocation.mutate(location)}
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {location.name}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {[location.region, location.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </span>
                        <MapPin className="text-muted-foreground size-4 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              className="space-y-4"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </motion.div>
          )}

          {isError && !isLoading && (
            <motion.div
              className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-10 text-center"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <p className="text-destructive text-sm">
                {error instanceof Error
                  ? error.message
                  : "Couldn't load weather"}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="cursor-pointer"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </motion.div>
          )}

          {data && !isLoading && !isError && (
            <motion.div
              key={motionKey}
              className="space-y-4"
              variants={staggerContainer(0.12)}
              initial={reduceMotion ? false : 'hidden'}
              animate="show"
            >
              {/* Current conditions */}
              <motion.section
                variants={cardVariants}
                className="border-border bg-card rounded-xl border p-6"
              >
                <div className="flex items-center gap-5">
                  <motion.div
                    className={`shrink-0 ${weatherToneClass(
                      data.current.code,
                      data.current.isDay,
                    )}`}
                    aria-hidden
                    animate={
                      reduceMotion
                        ? undefined
                        : { y: [0, -6, 0], rotate: [0, -3, 0] }
                    }
                    transition={{
                      duration: 5,
                      ease: 'easeInOut',
                      repeat: Infinity,
                    }}
                  >
                    <WeatherIcon
                      code={data.current.code}
                      isDay={data.current.isDay}
                      className="size-16 stroke-[1.35]"
                    />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1">
                      <AnimatedNumber
                        value={data.current.temperature}
                        className="text-6xl font-light tabular-nums"
                      />
                      <span className="text-muted-foreground text-2xl">
                        {degree}
                      </span>
                    </div>
                    <p className="mt-1 text-base font-medium">
                      {data.current.label}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Feels like {data.current.apparentTemperature}°
                    </p>
                  </div>
                </div>
                <div className="border-border mt-5 flex gap-8 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="text-muted-foreground size-4" />
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Humidity
                      </div>
                      <div className="tabular-nums">
                        {data.current.humidity}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="text-muted-foreground size-4" />
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Wind
                      </div>
                      <div className="tabular-nums">
                        {data.current.windSpeed} mph
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Hourly */}
              {data.hourly.length > 0 && (
                <motion.section
                  id="weather-view-hourly"
                  variants={cardVariants}
                  className="border-border bg-card rounded-xl border p-4"
                >
                  <h2 className="text-muted-foreground mb-3 px-1 text-xs font-semibold uppercase tracking-wide">
                    Hourly
                  </h2>
                  <motion.div
                    className="flex gap-2 overflow-x-auto pb-1"
                    variants={staggerContainer(0.035)}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {data.hourly.map((h) => (
                      <motion.div
                        key={h.time}
                        variants={itemVariants}
                        whileHover={reduceMotion ? undefined : { y: -4 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="bg-muted/40 flex min-w-[60px] flex-col items-center gap-1.5 rounded-lg p-2"
                      >
                        <span className="text-muted-foreground text-xs">
                          {formatHour(h.time)}
                        </span>
                        <WeatherIcon
                          code={h.code}
                          isDay={h.isDay ?? data.current.isDay}
                          className={`size-5 stroke-[1.6] ${weatherToneClass(
                            h.code,
                            h.isDay ?? data.current.isDay,
                          )}`}
                        />
                        <span className="text-sm tabular-nums">
                          {h.temperature}°
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>
              )}

              {/* 7-day */}
              {data.daily.length > 0 && (
                <motion.section
                  id="weather-view-daily"
                  variants={cardVariants}
                  className="weather-forecast-card border-border bg-card rounded-xl border p-4"
                >
                  <h2 className="text-muted-foreground mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide">
                    <CalendarDays className="size-3.5 stroke-[1.8]" />
                    7-day forecast
                  </h2>
                  <motion.div
                    className="weather-forecast-list divide-border divide-y"
                    variants={staggerContainer(0.05)}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {data.daily.slice(0, 7).map((d, i) => {
                      const rangeStart =
                        ((d.low - forecastLow) / forecastSpan) * 100
                      const rangeWidth = Math.max(
                        ((d.high - d.low) / forecastSpan) * 100,
                        7,
                      )
                      const currentPosition =
                        ((data.current.temperature - forecastLow) /
                          forecastSpan) *
                        100

                      return (
                        <motion.div
                          key={d.date}
                          variants={itemVariants}
                          className="weather-forecast-row"
                        >
                          <span className="weather-forecast-day truncate text-sm">
                            {formatDay(d.date, i)}
                          </span>
                          <WeatherIcon
                            code={d.code}
                            className={`weather-forecast-icon size-5 stroke-[1.6] ${weatherToneClass(d.code)}`}
                          />
                          <span className="weather-forecast-precip text-xs tabular-nums">
                            {d.precipitationProbability > 0
                              ? `${d.precipitationProbability}%`
                              : ''}
                          </span>
                          <span className="weather-forecast-low text-muted-foreground text-sm tabular-nums">
                            {d.low}°
                          </span>
                          <span
                            className="weather-temperature-track"
                            aria-hidden
                          >
                            <span
                              className="weather-temperature-range"
                              style={{
                                left: `${rangeStart}%`,
                                width: `${rangeWidth}%`,
                              }}
                            />
                            {i === 0 && (
                              <span
                                className="weather-current-temperature"
                                style={{
                                  left: `${Math.min(Math.max(currentPosition, 0), 100)}%`,
                                }}
                              />
                            )}
                          </span>
                          <span className="weather-forecast-high text-sm font-medium tabular-nums">
                            {d.high}°
                          </span>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </motion.section>
              )}

              <p className="text-muted-foreground px-1 text-center text-xs">
                Updated{' '}
                {new Date(data.updatedAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                · Uses Today unit setting · Open-Meteo · no account needed
              </p>
            </motion.div>
          )}
        </div>
      </AppFrameContent>
    </AppShell>
  )
}
