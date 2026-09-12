import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export type TimeGridMode = 'day' | 'week'

interface TimeGridEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay?: boolean
}

export interface TimeGridRenderContext {
  allDay: boolean
  compact: boolean
}

interface CalendarTimeGridProps<TEvent extends TimeGridEvent> {
  mode: TimeGridMode
  anchorDate: Date
  events: TEvent[]
  eventKey: (event: TEvent) => string
  renderEvent: (event: TEvent, context: TimeGridRenderContext) => ReactNode
  onSelectDate?: (date: Date) => void
  loading?: boolean
}

const HOUR_HEIGHT = 64
const DAY_MINUTES = 24 * 60
const DAY_HEIGHT = 24 * HOUR_HEIGHT
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_RE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function eventDate(value: string, allDay: boolean): Date | null {
  const parsed = allDay ? parseDateOnly(value) : new Date(value)
  if (!parsed || Number.isNaN(parsed.getTime())) return null
  return parsed
}

function eventOccursOnDay(event: TimeGridEvent, day: Date): boolean {
  const allDay = event.isAllDay === true
  const start = eventDate(event.start, allDay)
  const end = eventDate(event.end, allDay)
  if (!start || !end) return false

  const targetStart = startOfDay(day)
  const targetEnd = addDays(targetStart, 1)
  return start < targetEnd && end > targetStart
}

// Calendar apps conventionally lift events spanning multiple dates into the
// all-day lane. Keeping them in the hourly grid would create a separate
// near-full-height block in every day column.
function eventUsesAllDayLane(event: TimeGridEvent): boolean {
  if (event.isAllDay) return true

  const start = eventDate(event.start, false)
  const end = eventDate(event.end, false)
  if (!start || !end || end <= start) return false

  const inclusiveEnd = new Date(end.getTime() - 1)
  return (
    end.getTime() - start.getTime() >= DAY_MILLISECONDS ||
    !isSameDay(start, inclusiveEnd)
  )
}

function eventPosition(event: TimeGridEvent, day: Date) {
  const start = eventDate(event.start, false)
  const end = eventDate(event.end, false)
  if (!start || !end) return null

  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const clippedStart = start < dayStart ? dayStart : start
  const clippedEnd = end > dayEnd ? dayEnd : end
  const startMinutes = Math.max(
    0,
    (clippedStart.getTime() - dayStart.getTime()) / 60_000,
  )
  const endMinutes = Math.min(
    DAY_MINUTES,
    (clippedEnd.getTime() - dayStart.getTime()) / 60_000,
  )
  if (endMinutes <= startMinutes) return null

  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: Math.max(22, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
  }
}

function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`
}

function timeZoneLabel(): string {
  const part = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(new Date())
    .find((candidate) => candidate.type === 'timeZoneName')
  return part?.value ?? ''
}

export function CalendarTimeGrid<TEvent extends TimeGridEvent>({
  mode,
  anchorDate,
  events,
  eventKey,
  renderEvent,
  onSelectDate,
  loading = false,
}: CalendarTimeGridProps<TEvent>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days = useMemo(() => {
    if (mode === 'day') return [startOfDay(anchorDate)]
    const weekStart = startOfWeek(anchorDate)
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    })
  }, [anchorDate, mode])
  const gridTemplateColumns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`
  const now = new Date()
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT

  useEffect(() => {
    const scrollNode = scrollRef.current
    if (!scrollNode) return
    const frame = window.requestAnimationFrame(() => {
      scrollNode.scrollTop = 7 * HOUR_HEIGHT
    })
    return () => window.cancelAnimationFrame(frame)
  }, [mode])

  return (
    <section
      className="calendar-time-grid flex min-h-0 flex-1 flex-col"
      aria-label={`${mode === 'day' ? 'Day' : 'Week'} calendar`}
      aria-busy={loading}
    >
      <div
        className="calendar-time-grid-header border-border grid shrink-0 border-b"
        style={{ gridTemplateColumns }}
      >
        <div className="text-muted-foreground flex items-center justify-end border-r px-2 text-[10px] font-medium">
          {timeZoneLabel()}
        </div>
        {days.map((day) => {
          const today = isSameDay(day, now)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate?.(day)}
              className="border-border hover:bg-muted/30 flex h-10 cursor-pointer items-center justify-center gap-1.5 border-r text-xs transition-colors"
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-current={today ? 'date' : undefined}
            >
              <span className="text-muted-foreground font-medium">
                {format(day, 'EEE')}
              </span>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-md font-semibold tabular-nums',
                  today
                    ? 'bg-destructive text-destructive-foreground'
                    : 'text-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className="calendar-time-grid-all-day border-border grid min-h-9 shrink-0 border-b"
        style={{ gridTemplateColumns }}
      >
        <div className="text-muted-foreground flex items-center justify-end border-r px-2 text-[10px] font-medium">
          All-day
        </div>
        {days.map((day) => {
          const dayEvents = events.filter(
            (event) =>
              eventUsesAllDayLane(event) && eventOccursOnDay(event, day),
          )
          return (
            <div
              key={day.toISOString()}
              className="border-border min-w-0 space-y-1 border-r p-1"
            >
              {dayEvents.map((event) => (
                <div key={eventKey(event)} className="min-w-0">
                  {renderEvent(event, {
                    allDay: true,
                    compact: mode === 'week',
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative min-w-0" style={{ height: DAY_HEIGHT }}>
          <div className="absolute inset-y-0 left-0 w-14">
            {Array.from({ length: 24 }, (_, hour) => (
              <span
                key={hour}
                className="text-muted-foreground absolute right-2 text-[10px] font-medium tabular-nums"
                style={{ top: Math.max(2, hour * HOUR_HEIGHT - 6) }}
              >
                {hourLabel(hour)}
              </span>
            ))}
            {days.some((day) => isSameDay(day, now)) ? (
              <span
                className="text-destructive bg-background absolute right-1 z-20 px-1 text-[10px] font-semibold tabular-nums"
                style={{ top: nowTop - 7 }}
              >
                {format(now, 'h:mm a')}
              </span>
            ) : null}
          </div>

          <div
            className="absolute inset-y-0 left-14 right-0 grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => {
              const timedEvents = events.filter(
                (event) =>
                  !eventUsesAllDayLane(event) && eventOccursOnDay(event, day),
              )
              const today = isSameDay(day, now)

              return (
                <div
                  key={day.toISOString()}
                  className="border-border relative min-w-0 border-r"
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="border-border/60 absolute inset-x-0 border-t"
                      style={{ top: hour * HOUR_HEIGHT }}
                    />
                  ))}

                  {today ? (
                    <div
                      className="border-destructive pointer-events-none absolute inset-x-0 z-20 border-t"
                      style={{ top: nowTop }}
                    >
                      <span className="bg-destructive absolute -left-1 -top-1 size-2 rounded-full" />
                    </div>
                  ) : null}

                  {timedEvents.map((event) => {
                    const position = eventPosition(event, day)
                    if (!position) return null
                    return (
                      <div
                        key={`${eventKey(event)}:${day.toISOString()}`}
                        className="absolute left-1 right-1 z-10 min-w-0"
                        style={{
                          top: position.top + 1,
                          height: position.height - 2,
                        }}
                      >
                        {renderEvent(event, {
                          allDay: false,
                          compact: mode === 'week' || position.height < 44,
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
