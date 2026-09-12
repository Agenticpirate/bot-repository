import type { ReactNode } from 'react'
import { Skeleton } from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
} from 'date-fns'

export type MobileCalendarViewMode = 'day' | 'week' | 'month'

interface MobileCalendarEvent {
  id: string
  start: string
  end: string
  isAllDay?: boolean
}

interface MobileCalendarViewProps<TEvent extends MobileCalendarEvent> {
  view: MobileCalendarViewMode
  anchorDate: Date
  selectedDate: Date
  monthDays: Date[]
  monthOverviewExpanded: boolean
  loading: boolean
  eventsForDay: (day: Date) => TEvent[]
  eventKey: (event: TEvent) => string
  eventColor: (event: TEvent) => string | null
  onSelectDate: (day: Date) => void
  agenda: ReactNode
}

/**
 * The mobile projection intentionally has its own information hierarchy.
 * Month remains a real month overview, while Day and Week use touch-sized date
 * strips above the focused agenda. The month overview can also be expanded
 * above either focused view, matching native calendar disclosure patterns.
 */
export function MobileCalendarView<TEvent extends MobileCalendarEvent>({
  view,
  anchorDate,
  selectedDate,
  monthDays,
  monthOverviewExpanded,
  loading,
  eventsForDay,
  eventKey,
  eventColor,
  onSelectDate,
  agenda,
}: MobileCalendarViewProps<TEvent>) {
  const showMonthOverview = monthOverviewExpanded
  const stripDays =
    view === 'day'
      ? [addDays(selectedDate, -1), selectedDate, addDays(selectedDate, 1)]
      : eachDayOfInterval({
          start: startOfWeek(selectedDate),
          end: endOfWeek(selectedDate),
        })

  return (
    <section className="calendar-mobile-surface flex size-full min-h-0 flex-col">
      {showMonthOverview ? (
        <MobileMonthOverview
          month={anchorDate}
          selectedDate={selectedDate}
          days={monthDays}
          loading={loading}
          eventsForDay={eventsForDay}
          eventKey={eventKey}
          eventColor={eventColor}
          onSelectDate={onSelectDate}
        />
      ) : null}

      {view !== 'month' ? (
        <MobileDateStrip
          days={stripDays}
          selectedDate={selectedDate}
          eventsForDay={eventsForDay}
          eventKey={eventKey}
          eventColor={eventColor}
          onSelectDate={onSelectDate}
        />
      ) : null}

      <div className="calendar-mobile-agenda-panel border-border min-h-0 flex-1 border-t">
        {agenda}
      </div>
    </section>
  )
}

function MobileMonthOverview<TEvent extends MobileCalendarEvent>({
  month,
  selectedDate,
  days,
  loading,
  eventsForDay,
  eventKey,
  eventColor,
  onSelectDate,
}: {
  month: Date
  selectedDate: Date
  days: Date[]
  loading: boolean
  eventsForDay: (day: Date) => TEvent[]
  eventKey: (event: TEvent) => string
  eventColor: (event: TEvent) => string | null
  onSelectDate: (day: Date) => void
}) {
  return (
    <div className="calendar-mobile-month border-border shrink-0 border-b px-3 pb-2">
      <div className="grid grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
          <span
            key={`${weekday}-${index}`}
            className="text-muted-foreground flex h-6 items-center justify-center text-[10px] font-semibold"
          >
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day)
          const selected = isSameDay(day, selectedDate)
          const today = isToday(day)
          const inMonth = isSameMonth(day, month)
          const eventLabel =
            dayEvents.length === 1 ? '1 event' : `${dayEvents.length} events`

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}, ${eventLabel}`}
              aria-current={today ? 'date' : undefined}
              aria-pressed={selected}
              className={cn(
                'calendar-mobile-month-day relative flex min-h-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium tabular-nums transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/35',
                selected && !today && 'bg-muted text-foreground',
                !selected && 'hover:bg-muted/60 active:bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-md',
                  today && 'bg-destructive text-destructive-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              <EventDots
                events={dayEvents}
                eventKey={eventKey}
                eventColor={eventColor}
                loading={loading && inMonth}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MobileDateStrip<TEvent extends MobileCalendarEvent>({
  days,
  selectedDate,
  eventsForDay,
  eventKey,
  eventColor,
  onSelectDate,
}: {
  days: Date[]
  selectedDate: Date
  eventsForDay: (day: Date) => TEvent[]
  eventKey: (event: TEvent) => string
  eventColor: (event: TEvent) => string | null
  onSelectDate: (day: Date) => void
}) {
  return (
    <div
      className="calendar-mobile-date-strip border-border grid shrink-0 border-b px-2 py-1.5"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate)
        const today = isToday(day)
        const dayEvents = eventsForDay(day)

        return (
          <button
            type="button"
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            aria-label={format(day, 'EEEE, MMMM d, yyyy')}
            aria-current={today ? 'date' : undefined}
            aria-pressed={selected}
            className={cn(
              'flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg transition-colors',
              selected ? 'bg-muted text-foreground' : 'hover:bg-muted/50',
            )}
          >
            <span className="text-muted-foreground text-[9px] font-semibold uppercase">
              {format(day, 'EEE')}
            </span>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-md text-xs font-semibold tabular-nums',
                today && 'bg-destructive text-destructive-foreground',
              )}
            >
              {format(day, 'd')}
            </span>
            <EventDots
              events={dayEvents}
              eventKey={eventKey}
              eventColor={eventColor}
            />
          </button>
        )
      })}
    </div>
  )
}

function EventDots<TEvent extends MobileCalendarEvent>({
  events,
  eventKey,
  eventColor,
  loading = false,
}: {
  events: TEvent[]
  eventKey: (event: TEvent) => string
  eventColor: (event: TEvent) => string | null
  loading?: boolean
}) {
  if (loading) {
    return <Skeleton className="h-1 w-3 rounded-full" />
  }

  return (
    <span className="flex h-1 items-center justify-center gap-0.5" aria-hidden>
      {events.slice(0, 3).map((event) => (
        <span
          key={eventKey(event)}
          className="size-1 rounded-full"
          style={{ backgroundColor: eventColor(event) ?? 'var(--primary)' }}
        />
      ))}
    </span>
  )
}
