const MONTREAL_TIME_ZONE = 'America/Toronto'

export function montrealCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MONTREAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function montrealWeekStart(now = new Date()): string {
  const [year, month, day] = montrealCalendarDate(now).split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  const weekday = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  return date.toISOString().slice(0, 10)
}

export function isPlannedThisWeek(plannedForWeek?: string): boolean {
  return plannedForWeek === montrealWeekStart()
}

export function formatCookedDate(date: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}
