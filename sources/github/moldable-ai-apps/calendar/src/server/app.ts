import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { invokeAivaultJson } from '../lib/aivault'
import {
  getCalendarAccountContext,
  runWithCalendarAccountContext,
} from '../lib/calendar/account-context'
import {
  clearTokens,
  getAuthUrl,
  isAuthenticated,
  saveTokens,
} from '../lib/calendar/google-auth'
import {
  CALENDAR_UI_VIEWS,
  type CalendarUiIntent,
  type CalendarUiView,
} from '../shared/ui-intent'
import {
  type CalendarAccount,
  getCalendarAccountsState,
  resolveCalendarAccount,
  setActiveCalendarAccount,
} from './calendar-accounts'
import type { calendar_v3 } from 'googleapis'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const app = new Hono()

app.use('*', cors())

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
export interface CalendarEvent {
  id: string | null | undefined
  accountId?: string
  accountEmailAddress?: string
  iCalUID?: string | null | undefined
  title: string | null | undefined
  start: string | null | undefined
  end: string | null | undefined
  isAllDay: boolean
  location: string | null | undefined
  link: string | null | undefined
  status: string | null | undefined
  colorId: string | null | undefined
  organizer?: {
    email?: string | null
    displayName?: string | null
    self?: boolean | null
  } | null
  attendees?: {
    email?: string | null
    displayName?: string | null
    responseStatus?: string | null
    optional?: boolean | null
    organizer?: boolean | null
    self?: boolean | null
  }[]
  selfResponseStatus?: string | null
  conferenceUrl?: string | null
  conferenceProvider?: string | null
  description?: string | null
  recurrence?: string[] | null
  recurringEventId?: string | null
  originalStartTime?: string | null
}

function formatCalendarDate(value: string | null | undefined, allDay = false) {
  if (!value) return 'Not available'
  const date = new Date(
    allDay && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  )
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(allDay ? {} : { hour: 'numeric', minute: '2-digit' }),
  }).format(date)
}

function humanizeCalendarStatus(value: string | null | undefined) {
  if (!value) return 'No response'
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ')
}

function calendarInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || ''
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toUpperCase()
}

function sanitizedCalendarDescription(value: string | null | undefined) {
  const clean = (value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\((?:javascript:|data:)[^)]+\)/gi, '$1')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const truncated = clean.length > 6_000
  return {
    text: truncated ? `${clean.slice(0, 6_000).trimEnd()}…` : clean,
    truncationNotice: truncated
      ? 'The event description is abbreviated on iPhone. Open Google Calendar on your Mac for the complete description.'
      : '',
  }
}

function calendarRecurrenceLabel(
  recurrence: string[] | null | undefined,
  recurringEventId?: string | null,
) {
  const rule = recurrence?.find((item) => item.startsWith('RRULE:'))
  if (!rule) return recurringEventId ? 'Recurring event' : 'Does not repeat'
  const frequency = /(?:^RRULE:|;)FREQ=([A-Z]+)/.exec(rule)?.[1]
  const interval = Number(/(?:^|;)INTERVAL=(\d+)/.exec(rule)?.[1] ?? '1')
  const labels: Record<string, string> = {
    DAILY: 'day',
    WEEKLY: 'week',
    MONTHLY: 'month',
    YEARLY: 'year',
  }
  const unit = frequency ? labels[frequency] : undefined
  if (!unit) return 'Repeating event'
  return interval > 1 ? `Every ${interval} ${unit}s` : `Every ${unit}`
}

function nativeCalendarLocation(event: CalendarEvent) {
  const location = event.location?.trim()
  if (!location) return event.conferenceUrl ? 'Video call' : 'No location'
  if (/^(?:https?:\/\/|www\.)/i.test(location)) {
    return event.conferenceUrl ? 'Video call' : 'Online event'
  }
  return location
}

function nativeCalendarEventSummary(event: CalendarEvent) {
  const locationLabel = nativeCalendarLocation(event)
  return {
    id: event.id,
    accountId: event.accountId,
    accountEmailAddress: event.accountEmailAddress,
    title: event.title,
    startLabel: event.isAllDay
      ? `All day · ${formatCalendarDate(event.start, true)}`
      : formatCalendarDate(event.start),
    locationLabel,
    subtitleLabel: event.accountEmailAddress
      ? `${event.accountEmailAddress} · ${locationLabel}`
      : locationLabel,
    responseSummary: event.selfResponseStatus
      ? humanizeCalendarStatus(event.selfResponseStatus)
      : '',
    responseStatusDraft: event.selfResponseStatus ?? 'needsAction',
    leadingIcon: event.isAllDay
      ? 'sun.max'
      : event.conferenceUrl
        ? 'video'
        : event.location
          ? 'mappin.and.ellipse'
          : 'clock',
  }
}

export function nativeCalendarEvent(event: CalendarEvent) {
  const description = sanitizedCalendarDescription(event.description)
  const attendees = (event.attendees ?? []).map((attendee) => ({
    ...attendee,
    displayName: attendee.displayName || attendee.email || 'Guest',
    email: attendee.email || 'Email unavailable',
    responseLabel: humanizeCalendarStatus(attendee.responseStatus),
    initials: calendarInitials(attendee.displayName, attendee.email),
  }))
  return {
    id: event.id,
    accountId: event.accountId,
    accountEmailAddress: event.accountEmailAddress,
    title: event.title,
    isAllDay: event.isAllDay,
    recurrence: event.recurrence ?? [],
    recurringEventId: event.recurringEventId ?? null,
    originalStartTime: event.originalStartTime ?? null,
    startLabel: event.isAllDay
      ? `All day · ${formatCalendarDate(event.start, true)}`
      : formatCalendarDate(event.start),
    endLabel: event.isAllDay ? 'All day' : formatCalendarDate(event.end),
    locationLabel: nativeCalendarLocation(event),
    responseLabel: humanizeCalendarStatus(event.selfResponseStatus),
    responseSummary: event.selfResponseStatus
      ? humanizeCalendarStatus(event.selfResponseStatus)
      : '',
    organizerName:
      event.organizer?.displayName || event.organizer?.email || 'Not available',
    organizerEmail: event.organizer?.email || '',
    conferenceLabel: event.conferenceProvider || 'No video meeting',
    recurrenceLabel: calendarRecurrenceLabel(
      event.recurrence,
      event.recurringEventId,
    ),
    descriptionSections: description.text ? [{ text: description.text }] : [],
    descriptionTruncationNotice: description.truncationNotice,
    attendees: attendees.slice(0, 24),
    attendeeSummary:
      attendees.length > 24
        ? `Showing 24 of ${attendees.length} guests`
        : `${attendees.length} ${attendees.length === 1 ? 'guest' : 'guests'}`,
    attendeeEmptyStates:
      attendees.length === 0
        ? [
            {
              title: 'No guest list',
              description: 'This event has no attendee details.',
            },
          ]
        : [],
  }
}

interface CalendarListResponse {
  items?: calendar_v3.Schema$CalendarListEntry[]
}

interface EventListResponse {
  items?: calendar_v3.Schema$Event[]
}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const dateTimeParamSchema = z.string().refine((value) => {
  return !Number.isNaN(Date.parse(value))
}, 'Expected a parseable date-time string.')

const eventsListParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    timeMin: dateTimeParamSchema.optional(),
    timeMax: dateTimeParamSchema.optional(),
    onlyFuture: z.boolean().optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
    query: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (!value.timeMin || !value.timeMax) return

    const min = Date.parse(value.timeMin)
    const max = Date.parse(value.timeMax)
    if (min >= max) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeMin must be before timeMax.',
        path: ['timeMax'],
      })
      return
    }

    const maxRangeMs = 366 * 24 * 60 * 60 * 1000
    if (max - min > maxRangeMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date range cannot exceed 366 days.',
        path: ['timeMax'],
      })
    }
  })
  .optional()

const upcomingEventsParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    days: z.number().int().min(1).max(90).optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
  })
  .optional()

const nativeEventsParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    view: z.enum(['today', 'upcoming', 'range', 'search', 'picker', 'day']),
    query: z.string().trim().min(1).max(200).optional(),
    days: z.number().int().min(1).max(90).optional(),
    timeMin: dateTimeParamSchema.optional(),
    timeMax: dateTimeParamSchema.optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.view === 'search' && !value.query) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'query is required for search.',
        path: ['query'],
      })
    }
    if (value.view === 'range' && (!value.timeMin || !value.timeMax)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeMin and timeMax are required for a range.',
        path: ['timeMin'],
      })
    }
    if (value.view === 'day' && !value.date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date is required for a day agenda.',
        path: ['date'],
      })
    }
  })

const eventGetParamsSchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  id: z.string().min(1),
})

const eventFindByICalUidParamsSchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  iCalUid: z.string().min(1),
})

const eventRsvpParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    eventId: z.string().min(1).optional(),
    iCalUid: z.string().min(1).optional(),
    responseStatus: z.enum([
      'accepted',
      'tentative',
      'declined',
      'needsAction',
    ]),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const inviteeInputSchema = z
  .object({
    email: z.string().trim().email(),
    displayName: z.string().trim().min(1).max(200).optional(),
    optional: z.boolean().optional(),
  })
  .strict()

const inviteeUpdateSchema = z
  .object({
    email: z.string().trim().email(),
    newEmail: z.string().trim().email().optional(),
    displayName: z.string().trim().min(1).max(200).nullable().optional(),
    optional: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.newEmail !== undefined ||
      value.displayName !== undefined ||
      value.optional !== undefined,
    { message: 'Each invitee update must change at least one field.' },
  )

const inviteeMutationLocatorSchema = {
  accountId: z.string().trim().min(1).optional(),
  eventId: z.string().min(1).optional(),
  iCalUid: z.string().min(1).optional(),
  scope: z.enum(['event', 'series']).optional(),
} as const

const eventInviteesMutationParamsSchema = z
  .object({
    ...inviteeMutationLocatorSchema,
    add: z.array(inviteeInputSchema).max(200).optional(),
    update: z.array(inviteeUpdateSchema).max(200).optional(),
    remove: z.array(z.string().trim().email()).max(200).optional(),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })
  .refine(
    (value) =>
      Boolean(
        value.add?.length || value.update?.length || value.remove?.length,
      ),
    { message: 'At least one invitee mutation is required.' },
  )

const eventInviteesAddParamsSchema = z
  .object({
    ...inviteeMutationLocatorSchema,
    attendees: z.array(inviteeInputSchema).min(1).max(200),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const eventInviteesUpdateParamsSchema = z
  .object({
    ...inviteeMutationLocatorSchema,
    attendees: z.array(inviteeUpdateSchema).min(1).max(200),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const eventInviteesRemoveParamsSchema = z
  .object({
    ...inviteeMutationLocatorSchema,
    emails: z.array(z.string().trim().email()).min(1).max(200),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const recurrenceRuleInputSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1).max(99).optional(),
    byDay: z
      .array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']))
      .min(1)
      .max(7)
      .optional(),
    byMonthDay: z
      .array(
        z
          .number()
          .int()
          .min(-31)
          .max(31)
          .refine((day) => day !== 0, 'Month day cannot be zero.'),
      )
      .min(1)
      .max(31)
      .optional(),
    byMonth: z.array(z.number().int().min(1).max(12)).min(1).max(12).optional(),
    count: z.number().int().min(1).max(2500).optional(),
    until: dateTimeParamSchema.optional(),
    weekStartsOn: z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']).optional(),
  })
  .strict()
  .refine((value) => !(value.count && value.until), {
    message: 'Use either count or until, not both.',
  })

const eventCreateParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).max(500),
    description: z.string().max(10_000).optional(),
    location: z.string().max(1_000).optional(),
    start: dateTimeParamSchema,
    end: dateTimeParamSchema,
    timeZone: z.string().trim().min(1).max(100).optional(),
    recurrence: recurrenceRuleInputSchema.optional(),
    attendees: z.array(inviteeInputSchema).max(200).optional(),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.start) >= Date.parse(value.end)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start must be before end.',
        path: ['end'],
      })
    }
  })

const recurringEventLocatorSchema = {
  accountId: z.string().trim().min(1).optional(),
  eventId: z.string().min(1).optional(),
  iCalUid: z.string().min(1).optional(),
} as const

const recurringInstancesParamsSchema = z
  .object({
    ...recurringEventLocatorSchema,
    timeMin: dateTimeParamSchema.optional(),
    timeMax: dateTimeParamSchema.optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })
  .superRefine((value, context) => {
    if (
      value.timeMin &&
      value.timeMax &&
      Date.parse(value.timeMin) >= Date.parse(value.timeMax)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeMin must be before timeMax.',
        path: ['timeMax'],
      })
    }
  })

const recurringEventChangesSchema = z
  .object({
    summary: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(10_000).nullable().optional(),
    location: z.string().max(1_000).nullable().optional(),
    start: dateTimeParamSchema.optional(),
    end: dateTimeParamSchema.optional(),
    timeZone: z.string().trim().min(1).max(100).optional(),
    recurrence: recurrenceRuleInputSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one event change is required.',
  })
  .superRefine((value, context) => {
    if (Boolean(value.start) !== Boolean(value.end)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start and end must be changed together.',
        path: [value.start ? 'end' : 'start'],
      })
    }
    if (
      value.start &&
      value.end &&
      Date.parse(value.start) >= Date.parse(value.end)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start must be before end.',
        path: ['end'],
      })
    }
    if (value.timeZone && !value.start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeZone can only be changed together with start and end.',
        path: ['timeZone'],
      })
    }
  })

const recurringEventUpdateParamsSchema = z
  .object({
    ...recurringEventLocatorSchema,
    scope: z.enum(['instance', 'series']),
    changes: recurringEventChangesSchema,
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const recurringEventDeleteParamsSchema = z
  .object({
    ...recurringEventLocatorSchema,
    scope: z.enum(['instance', 'series']),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .strict()
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, 'Expected a real calendar date.')

const calendarMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Expected a month in YYYY-MM format.')
  .refine((value) => {
    const date = new Date(`${value}-01T00:00:00Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 7) === value
    )
  }, 'Expected a real calendar month.')

const uiDescribeParamsSchema = z.object({}).optional()
const uiNavigateParamsSchema = z.object({
  view: z.enum(CALENDAR_UI_VIEWS),
  entityId: z.string().optional(),
  params: z.record(z.unknown()).optional(),
})
const uiReadParamsSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    view: z.enum(CALENDAR_UI_VIEWS).optional(),
    entityId: z.string().optional(),
  })
  .optional()
const showDayParamsSchema = z.object({ date: calendarDateSchema })
const showMonthParamsSchema = z.object({ month: calendarMonthSchema })
const calendarPreferencesSchema = z.object({
  monthInspectorWidth: z.number().finite().min(224).max(480).optional(),
})
type CalendarPreferences = z.infer<typeof calendarPreferencesSchema>

const CALENDAR_UI_DESCRIPTIONS = [
  {
    id: 'day',
    name: 'Day agenda',
    description:
      'Show one local calendar day in the agenda and select its cell in the month grid. entityId is a YYYY-MM-DD date.',
  },
  {
    id: 'month',
    name: 'Month grid',
    description:
      'Show one calendar month and its surrounding grid days. entityId is a YYYY-MM month.',
  },
] satisfies Array<{
  id: CalendarUiView
  name: string
  description: string
}>

function uiIntentPath(workspaceId: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function calendarPreferencesPath(workspaceId: string): string {
  return safePath(getAppDataDir(workspaceId), 'preferences.json')
}

async function readCalendarPreferences(
  workspaceId: string,
): Promise<CalendarPreferences> {
  const stored = await readJson<unknown>(
    calendarPreferencesPath(workspaceId),
    {},
  )
  const parsed = calendarPreferencesSchema.safeParse(stored)
  return parsed.success ? parsed.data : {}
}

async function readUiIntent(
  workspaceId: string,
): Promise<CalendarUiIntent | null> {
  const intent = await readJson<CalendarUiIntent | null>(
    uiIntentPath(workspaceId),
    null,
  )
  if (
    !intent ||
    typeof intent.id !== 'string' ||
    !CALENDAR_UI_VIEWS.includes(intent.view)
  ) {
    return null
  }
  return intent
}

async function writeUiIntent(
  workspaceId: string,
  view: CalendarUiView,
  entityId: string,
  params?: Record<string, unknown>,
): Promise<CalendarUiIntent> {
  const intent: CalendarUiIntent = {
    id: randomUUID(),
    view,
    entityId,
    params,
    createdAt: new Date().toISOString(),
  }
  await writeJson(uiIntentPath(workspaceId), intent)
  return intent
}

function resolveUiTarget(input: {
  view: CalendarUiView
  entityId?: string
  params?: Record<string, unknown>
}) {
  if (input.view === 'day') {
    return calendarDateSchema.parse(input.entityId ?? input.params?.date)
  }
  return calendarMonthSchema.parse(input.entityId ?? input.params?.month)
}

function calendarReadRange(view: CalendarUiView, entityId: string) {
  const start =
    view === 'day'
      ? new Date(`${entityId}T00:00:00`)
      : new Date(`${entityId}-01T00:00:00`)
  const end = new Date(start)
  if (view === 'day') end.setDate(end.getDate() + 1)
  else end.setMonth(end.getMonth() + 1)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

function calendarDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mapGoogleEvent(
  event: calendar_v3.Schema$Event,
  account?: CalendarAccount,
): CalendarEvent {
  const selfAttendee = event.attendees?.find((attendee) => attendee.self)
  const conferenceEntryPoint = event.conferenceData?.entryPoints?.find(
    (entryPoint) =>
      entryPoint.entryPointType === 'video' && Boolean(entryPoint.uri),
  )

  return {
    id: event.id,
    accountId: account?.accountId,
    accountEmailAddress: account?.emailAddress,
    iCalUID: event.iCalUID,
    title: event.summary || 'Untitled event',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    isAllDay: !!event.start?.date,
    location: event.location,
    link: event.htmlLink,
    status: event.status,
    colorId: event.colorId,
    organizer: event.organizer
      ? {
          email: event.organizer.email,
          displayName: event.organizer.displayName,
          self: event.organizer.self,
        }
      : null,
    attendees: event.attendees?.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional,
      organizer: attendee.organizer,
      self: attendee.self,
    })),
    selfResponseStatus: selfAttendee?.responseStatus ?? null,
    conferenceUrl: conferenceEntryPoint?.uri ?? event.hangoutLink ?? null,
    conferenceProvider: event.conferenceData?.conferenceSolution?.name ?? null,
    description: event.description,
    recurrence: event.recurrence,
    recurringEventId: event.recurringEventId,
    originalStartTime:
      event.originalStartTime?.dateTime ?? event.originalStartTime?.date,
  }
}

function googleSelfResponseStatus(event: calendar_v3.Schema$Event) {
  return (
    event.attendees?.find((attendee) => attendee.self)?.responseStatus ?? null
  )
}

function shouldIncludeGoogleEvent(
  event: calendar_v3.Schema$Event,
  includeDeclined = false,
) {
  if (event.status === 'cancelled') return false
  if (!includeDeclined && googleSelfResponseStatus(event) === 'declined') {
    return false
  }
  return true
}

function visibleCalendarListEntry(item: calendar_v3.Schema$CalendarListEntry) {
  return item.hidden !== true
}

function calendarNotConnectedError() {
  const error = new Error('Calendar is not connected')
  error.name = 'CalendarNotConnected'
  return error
}

function calendarEventNotFoundError() {
  const error = new Error('Calendar event was not found')
  error.name = 'CalendarEventNotFound'
  return error
}

async function assertCalendarAccountAuthenticated(account: CalendarAccount) {
  if (!(await isAuthenticated(account.workspaceId, account.accountId))) {
    throw calendarNotConnectedError()
  }
}

async function resolveSingleCalendarAccount(
  workspaceId: string,
  requestedAccountId?: string | null,
) {
  const contextAccountId = getCalendarAccountContext(workspaceId)?.accountId
  const account = await resolveCalendarAccount(
    workspaceId,
    requestedAccountId ?? contextAccountId,
  )
  await assertCalendarAccountAuthenticated(account)
  return account
}

async function resolveCalendarReadAccounts(
  workspaceId: string,
  requestedAccountId?: string | null,
  scope: 'active' | 'all' = requestedAccountId ? 'active' : 'all',
) {
  if (requestedAccountId || scope === 'active') {
    return [await resolveSingleCalendarAccount(workspaceId, requestedAccountId)]
  }

  const state = await getCalendarAccountsState(workspaceId)
  const authentication = await Promise.all(
    state.accounts.map(async (account) => ({
      account,
      authenticated: await isAuthenticated(
        workspaceId,
        account.accountId,
      ).catch(() => false),
    })),
  )
  const accounts = authentication
    .filter((candidate) => candidate.authenticated)
    .map((candidate) => candidate.account)
    .sort((left, right) => {
      if (left.accountId === state.activeAccountId) return -1
      if (right.accountId === state.activeAccountId) return 1
      return left.emailAddress.localeCompare(right.emailAddress)
    })
  if (accounts.length === 0) throw calendarNotConnectedError()
  return accounts
}

async function fetchPrimaryCalendarListEntryForAccount(
  account: CalendarAccount,
) {
  await assertCalendarAccountAuthenticated(account)
  return runWithCalendarAccountContext(account, () =>
    invokeAivaultJson<calendar_v3.Schema$CalendarListEntry>(
      account.workspaceId,
      'google-calendar/lists',
      {
        method: 'GET',
        path: calendarPath('/users/me/calendarList/primary'),
      },
    ),
  )
}

async function primaryCalendarIsVisibleForAccount(account: CalendarAccount) {
  const primary = await fetchPrimaryCalendarListEntryForAccount(account)
  return visibleCalendarListEntry(primary)
}

interface CalendarEventFetchOptions {
  accountId?: string
  scope?: 'active' | 'all'
  timeMin?: string
  timeMax?: string
  includeDeclined?: boolean
  maxResults?: number
}

async function fetchCalendarEventsForAccount(
  account: CalendarAccount,
  options: CalendarEventFetchOptions,
): Promise<CalendarEvent[]> {
  if (!(await primaryCalendarIsVisibleForAccount(account))) return []

  const now = new Date()
  const defaultMin = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString()
  const defaultMax = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    0,
    23,
    59,
    59,
    999,
  ).toISOString()

  const params = new URLSearchParams()
  appendParam(params, 'timeMin', options.timeMin || defaultMin)
  appendParam(params, 'timeMax', options.timeMax || defaultMax)
  appendParam(params, 'singleEvents', true)
  appendParam(params, 'orderBy', 'startTime')
  appendParam(params, 'maxResults', options.maxResults ?? 2500)

  const response = await runWithCalendarAccountContext(account, () =>
    invokeAivaultJson<EventListResponse>(
      account.workspaceId,
      'google-calendar/events',
      {
        method: 'GET',
        path: calendarPath('/calendars/primary/events', params),
      },
    ),
  )

  return (response.items ?? [])
    .filter((event) => shouldIncludeGoogleEvent(event, options.includeDeclined))
    .map((event) => mapGoogleEvent(event, account))
}

async function fetchCalendarEvents(
  workspaceId: string,
  options: CalendarEventFetchOptions = {},
): Promise<CalendarEvent[]> {
  const accounts = await resolveCalendarReadAccounts(
    workspaceId,
    options.accountId,
    options.scope,
  )
  const results = await Promise.allSettled(
    accounts.map((account) => fetchCalendarEventsForAccount(account, options)),
  )
  const events = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  if (failures.length === results.length && failures[0]) {
    throw failures[0].reason
  }
  for (const failure of failures) {
    console.warn(
      'Failed to load one Google Calendar account:',
      failure.reason instanceof Error
        ? failure.reason.message
        : 'Unknown error',
    )
  }

  const limit = options.maxResults ?? 2500
  return events
    .sort((left, right) => {
      const leftTime = left.start ? Date.parse(left.start) : Number.MAX_VALUE
      const rightTime = right.start ? Date.parse(right.start) : Number.MAX_VALUE
      return leftTime - rightTime
    })
    .slice(0, limit)
}

async function fetchCalendarListForAccount(account: CalendarAccount) {
  await assertCalendarAccountAuthenticated(account)
  const response = await runWithCalendarAccountContext(account, () =>
    invokeAivaultJson<CalendarListResponse>(
      account.workspaceId,
      'google-calendar/lists',
      {
        method: 'GET',
        path: calendarPath('/users/me/calendarList'),
      },
    ),
  )

  return (response.items ?? [])
    .filter(visibleCalendarListEntry)
    .map((item) => ({
      id: item.id,
      accountId: account.accountId,
      accountEmailAddress: account.emailAddress,
      summary: item.summary,
      description: item.description,
      primary: item.primary,
      accessRole: item.accessRole,
      backgroundColor: item.backgroundColor,
      foregroundColor: item.foregroundColor,
    }))
}

async function fetchCalendarList(workspaceId: string, accountId?: string) {
  const accounts = await resolveCalendarReadAccounts(workspaceId, accountId)
  const results = await Promise.allSettled(
    accounts.map(fetchCalendarListForAccount),
  )
  const calendars = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  if (calendars.length === 0) {
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failure) throw failure.reason
  }
  return calendars
}

async function fetchEventByIdForAccount(
  account: CalendarAccount,
  eventId: string,
) {
  if (!(await primaryCalendarIsVisibleForAccount(account))) {
    throw calendarEventNotFoundError()
  }

  try {
    const event = await runWithCalendarAccountContext(account, () =>
      invokeAivaultJson<calendar_v3.Schema$Event>(
        account.workspaceId,
        'google-calendar/events',
        {
          method: 'GET',
          path: calendarPath(
            `/calendars/primary/events/${encodeURIComponent(eventId)}`,
          ),
        },
      ),
    )
    return { account, event }
  } catch (error) {
    const candidate = error as {
      status?: number
      response?: { status?: number }
    }
    if (candidate.status === 404 || candidate.response?.status === 404) {
      throw calendarEventNotFoundError()
    }
    throw error
  }
}

async function fetchEventById(
  workspaceId: string,
  eventId: string,
  accountId?: string,
) {
  const accounts = await resolveCalendarReadAccounts(workspaceId, accountId)
  for (const account of accounts) {
    try {
      return await fetchEventByIdForAccount(account, eventId)
    } catch (error) {
      if (error instanceof Error && error.name === 'CalendarEventNotFound') {
        continue
      }
      throw error
    }
  }
  throw calendarEventNotFoundError()
}

async function fetchGoogleEventsByICalUidForAccount(
  account: CalendarAccount,
  iCalUid: string,
) {
  if (!(await primaryCalendarIsVisibleForAccount(account))) return []

  const params = new URLSearchParams()
  appendParam(params, 'iCalUID', iCalUid)
  appendParam(params, 'maxResults', 10)
  appendParam(params, 'showDeleted', false)

  const response = await runWithCalendarAccountContext(account, () =>
    invokeAivaultJson<EventListResponse>(
      account.workspaceId,
      'google-calendar/events',
      {
        method: 'GET',
        path: calendarPath('/calendars/primary/events', params),
      },
    ),
  )
  return response.items ?? []
}

async function findGoogleEventByICalUid(
  workspaceId: string,
  iCalUid: string,
  accountId?: string,
) {
  const accounts = await resolveCalendarReadAccounts(workspaceId, accountId)
  for (const account of accounts) {
    const events = await fetchGoogleEventsByICalUidForAccount(account, iCalUid)
    const event =
      events.find((candidate) => candidate.status !== 'cancelled') ??
      events[0] ??
      null
    if (event) return { account, event }
  }
  return null
}

type RecurrenceRuleInput = z.infer<typeof recurrenceRuleInputSchema>

function rruleUtcDateTime(value: string) {
  return new Date(value)
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function buildGoogleRecurrenceLines(rule: RecurrenceRuleInput) {
  const fields = [`FREQ=${rule.frequency.toUpperCase()}`]
  if (rule.interval && rule.interval !== 1) {
    fields.push(`INTERVAL=${rule.interval}`)
  }
  if (rule.byDay?.length) fields.push(`BYDAY=${rule.byDay.join(',')}`)
  if (rule.byMonthDay?.length) {
    fields.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`)
  }
  if (rule.byMonth?.length) {
    fields.push(`BYMONTH=${rule.byMonth.join(',')}`)
  }
  if (rule.count) fields.push(`COUNT=${rule.count}`)
  if (rule.until) fields.push(`UNTIL=${rruleUtcDateTime(rule.until)}`)
  if (rule.weekStartsOn) fields.push(`WKST=${rule.weekStartsOn}`)
  return [`RRULE:${fields.join(';')}`]
}

async function createGoogleEvent(
  workspaceId: string,
  options: z.infer<typeof eventCreateParamsSchema>,
) {
  const account = await resolveSingleCalendarAccount(
    workspaceId,
    options.accountId,
  )
  if (!(await primaryCalendarIsVisibleForAccount(account))) {
    throw calendarNotConnectedError()
  }

  const timeZone =
    options.timeZone ??
    (options.recurrence
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined)
  const event: calendar_v3.Schema$Event = {
    summary: options.summary,
    description: options.description,
    location: options.location,
    start: {
      dateTime: options.start,
      ...(timeZone ? { timeZone } : {}),
    },
    end: {
      dateTime: options.end,
      ...(timeZone ? { timeZone } : {}),
    },
    attendees: options.attendees?.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      optional: attendee.optional,
    })),
    recurrence: options.recurrence
      ? buildGoogleRecurrenceLines(options.recurrence)
      : undefined,
  }

  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'none')

  const created = await runWithCalendarAccountContext(account, () =>
    invokeAivaultJson<calendar_v3.Schema$Event>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'POST',
        path: calendarPath('/calendars/primary/events', params),
        body: event as unknown as Record<string, unknown>,
      },
    ),
  )
  return { account, event: created }
}

type LocatedGoogleEvent = {
  account: CalendarAccount
  event: calendar_v3.Schema$Event
}

async function locateGoogleEvent(
  workspaceId: string,
  locator: {
    accountId?: string
    eventId?: string
    iCalUid?: string
  },
): Promise<LocatedGoogleEvent> {
  const found = locator.eventId
    ? await fetchEventById(workspaceId, locator.eventId, locator.accountId)
    : locator.iCalUid
      ? await findGoogleEventByICalUid(
          workspaceId,
          locator.iCalUid,
          locator.accountId,
        )
      : null
  if (!found?.event.id) throw calendarEventNotFoundError()
  return found
}

async function eventMutationTarget(
  found: LocatedGoogleEvent,
  scope: 'event' | 'instance' | 'series',
): Promise<LocatedGoogleEvent> {
  if (scope === 'event') return found

  if (scope === 'instance') {
    if (found.event.recurrence?.length && !found.event.recurringEventId) {
      const error = new Error(
        'Choose a concrete recurring-event instance before changing one occurrence.',
      )
      error.name = 'CalendarRecurringInstanceRequired'
      throw error
    }
    return found
  }

  const seriesId = found.event.recurringEventId
  if (!seriesId || seriesId === found.event.id) return found
  return fetchEventByIdForAccount(found.account, seriesId)
}

async function fetchRecurringInstances(
  workspaceId: string,
  options: z.infer<typeof recurringInstancesParamsSchema>,
) {
  const found = await locateGoogleEvent(workspaceId, options)
  const series = await eventMutationTarget(found, 'series')
  if (!series.event.id || !series.event.recurrence?.length) {
    const error = new Error('Calendar event is not a recurring series.')
    error.name = 'CalendarRecurringSeriesRequired'
    throw error
  }

  const params = new URLSearchParams()
  appendParam(params, 'timeMin', options.timeMin)
  appendParam(params, 'timeMax', options.timeMax)
  appendParam(params, 'maxResults', options.maxResults ?? 2500)
  appendParam(params, 'showDeleted', false)
  const response = await runWithCalendarAccountContext(series.account, () =>
    invokeAivaultJson<EventListResponse>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'GET',
        path: calendarPath(
          `/calendars/primary/events/${encodeURIComponent(series.event.id!)}/instances`,
          params,
        ),
      },
    ),
  )
  return (response.items ?? [])
    .filter((event) => shouldIncludeGoogleEvent(event, true))
    .map((event) => mapGoogleEvent(event, series.account))
}

async function updateRecurringGoogleEvent(
  workspaceId: string,
  options: z.infer<typeof recurringEventUpdateParamsSchema>,
) {
  const found = await locateGoogleEvent(workspaceId, options)
  const target = await eventMutationTarget(found, options.scope)
  if (!target.event.id) throw calendarEventNotFoundError()
  if (
    options.scope === 'instance' &&
    options.changes.recurrence !== undefined
  ) {
    const error = new Error(
      'Recurrence can only be changed for the entire series.',
    )
    error.name = 'CalendarRecurringScopeConflict'
    throw error
  }

  const changes = options.changes
  const patch: calendar_v3.Schema$Event = {}
  if (changes.summary !== undefined) patch.summary = changes.summary
  if (changes.description !== undefined) {
    patch.description = changes.description
  }
  if (changes.location !== undefined) patch.location = changes.location
  if (changes.start && changes.end) {
    const timeZone =
      changes.timeZone ??
      target.event.start?.timeZone ??
      (target.event.recurrence?.length || changes.recurrence
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined)
    patch.start = {
      dateTime: changes.start,
      ...(timeZone ? { timeZone } : {}),
    }
    patch.end = {
      dateTime: changes.end,
      ...(timeZone ? { timeZone } : {}),
    }
  }
  if (changes.recurrence !== undefined) {
    patch.recurrence = changes.recurrence
      ? buildGoogleRecurrenceLines(changes.recurrence)
      : []
  }

  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'all')
  const updated = await runWithCalendarAccountContext(target.account, () =>
    invokeAivaultJson<calendar_v3.Schema$Event>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'PATCH',
        path: calendarPath(
          `/calendars/primary/events/${encodeURIComponent(target.event.id!)}`,
          params,
        ),
        body: patch as unknown as Record<string, unknown>,
      },
    ),
  )
  return { account: target.account, event: updated }
}

async function deleteRecurringGoogleEvent(
  workspaceId: string,
  options: z.infer<typeof recurringEventDeleteParamsSchema>,
) {
  const found = await locateGoogleEvent(workspaceId, options)
  const target = await eventMutationTarget(found, options.scope)
  if (!target.event.id) throw calendarEventNotFoundError()

  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'all')
  await runWithCalendarAccountContext(target.account, () =>
    invokeAivaultJson<unknown>(workspaceId, 'google-calendar/events', {
      method: 'DELETE',
      path: calendarPath(
        `/calendars/primary/events/${encodeURIComponent(target.event.id!)}`,
        params,
      ),
    }),
  )
  return {
    accountId: target.account.accountId,
    deletedEventId: target.event.id,
    scope: options.scope,
    recurringEventId:
      found.event.recurringEventId ??
      (target.event.recurrence?.length ? target.event.id : null),
  }
}

type InviteeInput = z.infer<typeof inviteeInputSchema>
type InviteeUpdate = z.infer<typeof inviteeUpdateSchema>

type InviteeMutations = {
  add?: InviteeInput[]
  update?: InviteeUpdate[]
  remove?: string[]
  protectedEmails?: string[]
}

function attendeeEmailKey(email: string | null | undefined) {
  return email?.trim().toLocaleLowerCase() ?? ''
}

function calendarInviteeError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}

export function applyInviteeMutations(
  attendees: calendar_v3.Schema$EventAttendee[],
  mutations: InviteeMutations,
) {
  const result = attendees.map((attendee) => ({ ...attendee }))
  const protectedEmails = new Set(
    (mutations.protectedEmails ?? []).map(attendeeEmailKey).filter(Boolean),
  )
  const findIndex = (email: string) => {
    const key = attendeeEmailKey(email)
    return result.findIndex(
      (attendee) => attendeeEmailKey(attendee.email) === key,
    )
  }
  const assertMutable = (attendee: calendar_v3.Schema$EventAttendee) => {
    if (
      attendee.self ||
      attendee.organizer ||
      protectedEmails.has(attendeeEmailKey(attendee.email))
    ) {
      throw calendarInviteeError(
        'CalendarProtectedInvitee',
        `${attendee.email ?? 'This attendee'} is the organizer or connected user and cannot be edited as an invitee.`,
      )
    }
  }

  for (const email of mutations.remove ?? []) {
    const index = findIndex(email)
    if (index === -1) continue
    assertMutable(result[index]!)
    result.splice(index, 1)
  }

  for (const update of mutations.update ?? []) {
    const index = findIndex(update.email)
    if (index === -1) {
      throw calendarInviteeError(
        'CalendarInviteeNotFound',
        `Calendar could not find ${update.email} on this event.`,
      )
    }

    const current = result[index]!
    assertMutable(current)
    const nextEmail = update.newEmail?.trim()
    if (nextEmail) {
      const conflictingIndex = findIndex(nextEmail)
      if (conflictingIndex !== -1 && conflictingIndex !== index) {
        throw calendarInviteeError(
          'CalendarInviteeConflict',
          `${nextEmail} is already an invitee on this event.`,
        )
      }
    }

    const emailChanged =
      Boolean(nextEmail) &&
      attendeeEmailKey(nextEmail) !== attendeeEmailKey(current.email)
    result[index] = {
      ...current,
      ...(nextEmail ? { email: nextEmail } : {}),
      ...(update.displayName !== undefined
        ? { displayName: update.displayName ?? undefined }
        : {}),
      ...(update.optional !== undefined ? { optional: update.optional } : {}),
      ...(emailChanged ? { responseStatus: 'needsAction' } : {}),
    }
  }

  for (const addition of mutations.add ?? []) {
    const existingIndex = findIndex(addition.email)
    if (existingIndex !== -1) {
      const current = result[existingIndex]!
      const changesExisting =
        addition.displayName !== undefined || addition.optional !== undefined
      if (changesExisting) assertMutable(current)
      result[existingIndex] = {
        ...current,
        ...(addition.displayName !== undefined
          ? { displayName: addition.displayName }
          : {}),
        ...(addition.optional !== undefined
          ? { optional: addition.optional }
          : {}),
      }
      continue
    }

    result.push({
      email: addition.email.trim(),
      ...(addition.displayName
        ? { displayName: addition.displayName.trim() }
        : {}),
      ...(addition.optional !== undefined
        ? { optional: addition.optional }
        : {}),
    })
  }

  return result
}

async function mutateGoogleEventInvitees(
  workspaceId: string,
  options: z.infer<typeof eventInviteesMutationParamsSchema>,
) {
  const located = await locateGoogleEvent(workspaceId, options)
  const found = await eventMutationTarget(
    located,
    options.scope === 'series' ? 'series' : 'event',
  )
  if (!found.event.id) throw calendarEventNotFoundError()

  const existingAttendees = found.event.attendees ?? []
  const attendees = applyInviteeMutations(existingAttendees, {
    add: options.add,
    update: options.update,
    remove: options.remove,
    protectedEmails: [found.event.organizer?.email ?? ''],
  })
  if (JSON.stringify(attendees) === JSON.stringify(existingAttendees)) {
    return found
  }
  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'all')

  const updated = await runWithCalendarAccountContext(found.account, () =>
    invokeAivaultJson<calendar_v3.Schema$Event>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'PATCH',
        path: calendarPath(
          `/calendars/primary/events/${encodeURIComponent(found.event.id!)}`,
          params,
        ),
        body: { attendees },
      },
    ),
  )

  return { account: found.account, event: updated }
}

async function rsvpToGoogleEvent(
  workspaceId: string,
  options: z.infer<typeof eventRsvpParamsSchema>,
) {
  const found = options.eventId
    ? await fetchEventById(workspaceId, options.eventId, options.accountId)
    : options.iCalUid
      ? await findGoogleEventByICalUid(
          workspaceId,
          options.iCalUid,
          options.accountId,
        )
      : null

  if (!found?.event.id) throw calendarEventNotFoundError()

  const attendees = found.event.attendees ?? []
  const selfIndex = attendees.findIndex((attendee) => attendee.self)
  if (selfIndex === -1) {
    const error = new Error(
      'Calendar event does not identify your attendee record',
    )
    error.name = 'CalendarAttendeeNotFound'
    throw error
  }

  const updatedAttendees = attendees.map((attendee, index) =>
    index === selfIndex
      ? { ...attendee, responseStatus: options.responseStatus }
      : attendee,
  )
  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'all')

  const updated = await runWithCalendarAccountContext(found.account, () =>
    invokeAivaultJson<calendar_v3.Schema$Event>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'PATCH',
        path: calendarPath(
          `/calendars/primary/events/${encodeURIComponent(found.event.id!)}`,
          params,
        ),
        body: { attendees: updatedAttendees },
      },
    ),
  )
  return { account: found.account, event: updated }
}

function calendarPath(pathname: string, params?: URLSearchParams) {
  const query = rawQuery(params)
  return `/calendar/v3${pathname}${query ? `?${query}` : ''}`
}

function rawQuery(params?: URLSearchParams) {
  if (!params) return ''
  return params.toString()
}

function appendParam(
  params: URLSearchParams,
  name: string,
  value: string | number | boolean | undefined,
) {
  if (value === undefined || value === '') return
  params.append(name, String(value))
}

function isCalendarAuthError(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
    message?: string
  }
  const message = candidate.message ?? ''

  return (
    candidate.code === 401 ||
    candidate.status === 401 ||
    candidate.response?.status === 401 ||
    message.includes('client_secret is missing') ||
    message.includes('invalid_grant') ||
    message.includes('oauth2 token endpoint returned 400')
  )
}

function workspaceIdFromRequest(request: Request): string | null {
  const workspaceId =
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request) ??
    null

  if (!workspaceId) return null

  try {
    return sanitizeId(workspaceId)
  } catch {
    return null
  }
}

function workspaceRequiredResponse() {
  return {
    ok: false,
    error: {
      code: 'workspace_required',
      message: 'Calendar requires an explicit Moldable workspace.',
    },
  }
}

function isBrokerRpcRequest(request: Request) {
  return request.headers.get('x-moldable-rpc') === '1'
}

function filterEventsByQuery(events: CalendarEvent[], query?: string) {
  if (!query?.trim()) return events
  const normalized = query.toLowerCase()
  return events.filter((event) =>
    [
      event.title,
      event.location,
      event.status,
      event.conferenceProvider,
      event.conferenceUrl,
      event.organizer?.displayName,
      event.organizer?.email,
      ...(event.attendees ?? []).flatMap((attendee) => [
        attendee.displayName,
        attendee.email,
      ]),
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase()
      .includes(normalized),
  )
}

function todayRange(onlyFuture = true) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )

  return {
    timeMin: (onlyFuture ? now : start).toISOString(),
    timeMax: end.toISOString(),
  }
}

// Shared, theme-aware styles for the OAuth handoff pages. These render in a
// popup that is outside the React app, so they can't use design-system tokens —
// instead they mirror the token palette via prefers-color-scheme so the page
// reads correctly whether the user's system is light or dark.
function authPageStyles() {
  return `
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --card: #ffffff;
      --border: #e4e4e7;
      --fg: #18181b;
      --muted: #71717a;
      --accent: #16a34a;
      --accent-soft: #dcfce7;
      --danger: #dc2626;
      --danger-soft: #fee2e2;
      --link: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --card: #161616;
        --border: #27272a;
        --fg: #fafafa;
        --muted: #a1a1aa;
        --accent: #4ade80;
        --accent-soft: rgba(74, 222, 128, 0.12);
        --danger: #f87171;
        --danger-soft: rgba(248, 113, 113, 0.12);
        --link: #60a5fa;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--fg);
    }
    .card {
      width: 100%;
      max-width: 360px;
      text-align: center;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 9999px;
      margin: 0 auto 16px;
      font-size: 22px;
    }
    .badge.ok { background: var(--accent-soft); color: var(--accent); }
    .badge.err { background: var(--danger-soft); color: var(--danger); }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.01em; }
    p { font-size: 14px; line-height: 1.5; color: var(--muted); margin: 0; }
    a { color: var(--link); text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 20px; }
  `
}

function authSuccessHtml(account: CalendarAccount) {
  const successMessage = JSON.stringify({
    type: 'oauth-success',
    accountId: account.accountId,
    emailAddress: account.emailAddress,
  }).replaceAll('<', '\\u003c')
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Successful</title>
        <style>${authPageStyles()}</style>
      </head>
      <body>
        <div class="card">
          <div class="badge ok">✓</div>
          <h1>Calendar connected</h1>
          <p>${escapeHtml(account.emailAddress)}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage(${successMessage}, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              setTimeout(() => window.location.href = '/', 1000);
            }
          </script>
        </div>
      </body>
    </html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function authFailureHtml(message: string) {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Failed</title>
        <style>${authPageStyles()}</style>
      </head>
      <body>
        <div class="card">
          <div class="badge err">✕</div>
          <h1>Couldn’t connect</h1>
          <p>${escapeHtml(message)}</p>
          <p class="footer"><a href="/">Return to Calendar</a></p>
        </div>
      </body>
    </html>`
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'calendar',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/preferences', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)

  return c.json(await readCalendarPreferences(workspaceId))
})

app.post('/api/preferences', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)

  try {
    const updates = calendarPreferencesSchema.parse(await c.req.json())
    const current = await readCalendarPreferences(workspaceId)
    const preferences = { ...current, ...updates }
    await writeJson(calendarPreferencesPath(workspaceId), preferences)
    return c.json(preferences)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Invalid Calendar preferences',
          detail: error.flatten(),
        },
        400,
      )
    }
    console.error('Failed to save Calendar preferences:', error)
    return c.json({ error: 'Failed to save Calendar preferences' }, 500)
  }
})

app.get('/api/auth/login', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const url = await getAuthUrl(workspaceId)
    return c.json({ url })
  } catch (error) {
    console.error('Login error:', error)
    return c.json(
      {
        error: 'Failed to generate auth URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }

  try {
    const { account } = await saveTokens(code, state)
    return c.html(authSuccessHtml(account))
  } catch (error) {
    console.error('Auth error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to exchange code'
    return c.html(authFailureHtml(errorMessage), 500)
  }
})

app.post('/api/auth/logout', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const account = await resolveCalendarAccount(
      workspaceId,
      c.req.query('accountId'),
    )
    const result = await clearTokens(workspaceId, account.accountId)
    return c.json({ success: true, ...result })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Failed to logout' }, 500)
  }
})

app.get('/api/accounts', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)
  const state = await getCalendarAccountsState(workspaceId)
  return c.json({
    activeAccountId: state.activeAccountId,
    accounts: state.accounts.map(({ accountId, emailAddress }) => ({
      id: accountId,
      emailAddress,
    })),
  })
})

app.post('/api/accounts/active', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)
  const input = z
    .object({ accountId: z.string().trim().min(1) })
    .strict()
    .parse(await c.req.json())
  const account = await setActiveCalendarAccount(workspaceId, input.accountId)
  return c.json({
    activeAccountId: account.accountId,
    account: { id: account.accountId, emailAddress: account.emailAddress },
  })
})

app.get('/api/status', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)

  try {
    const state = await getCalendarAccountsState(workspaceId)
    const authentication = await Promise.all(
      state.accounts.map(async (account) => ({
        account,
        authenticated: await isAuthenticated(
          workspaceId,
          account.accountId,
        ).catch(() => false),
      })),
    )
    let activeAccount = authentication.find(
      (candidate) =>
        candidate.account.accountId === state.activeAccountId &&
        candidate.authenticated,
    )?.account
    activeAccount ??= authentication.find(
      (candidate) => candidate.authenticated,
    )?.account
    if (activeAccount && activeAccount.accountId !== state.activeAccountId) {
      activeAccount = await setActiveCalendarAccount(
        workspaceId,
        activeAccount.accountId,
      )
    }

    return c.json({
      authenticated: Boolean(activeAccount),
      activeAccountId: activeAccount?.accountId ?? state.activeAccountId,
      accounts: authentication.map(({ account, authenticated }) => ({
        id: account.accountId,
        emailAddress: account.emailAddress,
        authenticated,
      })),
    })
  } catch (error) {
    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
      return c.json({
        authenticated: false,
        activeAccountId: null,
        accounts: [],
      })
    }
    console.error('Failed to load Calendar status:', error)
    return c.json({ error: 'Failed to load Calendar status' }, 500)
  }
})

app.post('/api/rsvp', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const eventParams = eventRsvpParamsSchema.parse(await c.req.json())
    const result = await rsvpToGoogleEvent(workspaceId, eventParams)
    return c.json({
      ok: true,
      event: mapGoogleEvent(result.event, result.account),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Calendar received invalid RSVP parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    if (error instanceof Error && error.name === 'CalendarEventNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'event_not_found',
            message: 'Calendar event was not found.',
          },
        },
        404,
      )
    }

    if (error instanceof Error && error.name === 'CalendarAttendeeNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'attendee_not_found',
            message:
              'Calendar could not find your attendee record for this event.',
          },
        },
        409,
      )
    }

    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'calendar_not_connected',
            message: 'Connect Calendar before updating events.',
          },
        },
        401,
      )
    }

    console.error('Calendar RSVP failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'calendar_rsvp_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Calendar could not update the event.',
        },
      },
      500,
    )
  }
})

app.patch('/api/events/invitees', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const params = eventInviteesMutationParamsSchema.parse(await c.req.json())
    const result = await mutateGoogleEventInvitees(workspaceId, params)
    return c.json({
      ok: true,
      event: mapGoogleEvent(result.event, result.account),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Calendar received invalid invitee changes.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    if (error instanceof Error && error.name === 'CalendarEventNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'event_not_found',
            message: 'Calendar event was not found.',
          },
        },
        404,
      )
    }

    if (error instanceof Error && error.name === 'CalendarInviteeNotFound') {
      return c.json(
        {
          ok: false,
          error: { code: 'invitee_not_found', message: error.message },
        },
        404,
      )
    }

    if (
      error instanceof Error &&
      ['CalendarProtectedInvitee', 'CalendarInviteeConflict'].includes(
        error.name,
      )
    ) {
      return c.json(
        {
          ok: false,
          error: { code: 'invitee_conflict', message: error.message },
        },
        409,
      )
    }

    if (
      error instanceof Error &&
      [
        'CalendarRecurringInstanceRequired',
        'CalendarRecurringScopeConflict',
      ].includes(error.name)
    ) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'recurring_event_scope_conflict',
            message: error.message,
          },
        },
        409,
      )
    }

    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'calendar_not_connected',
            message: 'Connect Calendar before updating invitees.',
          },
        },
        401,
      )
    }

    const candidate = error as {
      status?: number
      response?: { status?: number }
    }
    if (candidate.status === 403 || candidate.response?.status === 403) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invitees_forbidden',
            message: 'Only an event organizer can change its invitees.',
          },
        },
        403,
      )
    }

    console.error('Calendar invitee update failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'calendar_invitee_update_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Calendar could not update event invitees.',
        },
      },
      500,
    )
  }
})

app.get('/api/events', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const params = eventsListParamsSchema.parse({
      accountId: c.req.query('accountId'),
      timeMin: c.req.query('timeMin'),
      timeMax: c.req.query('timeMax'),
    })
    const events = await fetchCalendarEvents(workspaceId, {
      accountId: params?.accountId,
      scope: c.req.query('scope') === 'active' ? 'active' : 'all',
      timeMin: params?.timeMin,
      timeMax: params?.timeMax,
      includeDeclined: true,
    })

    return c.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    const errorMessage = error instanceof Error ? error.message : ''
    const errorCode = (error as { code?: number })?.code
    const errorStatus = (error as { status?: number })?.status

    if (error instanceof Error && error.name === 'CalendarNotConnected') {
      return c.json({ events: [], authenticated: false }, 401)
    }

    if (errorMessage.includes('Missing') || isCalendarAuthError(error)) {
      return c.json({ events: [], authenticated: false }, 401)
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Invalid event query parameters',
          detail: error.flatten(),
        },
        400,
      )
    }

    return c.json(
      {
        error: 'Failed to fetch events',
        detail: errorMessage,
        code: errorCode,
        status: errorStatus,
      },
      500,
    )
  }
})

// Today contribution: surface ONLY an imminent meeting (starting within the next
// ~20 min, or in progress) — the one calendar moment that earns attention. Lead
// with Join (conference URL) when there's a video call, offer in-place RSVP when
// you haven't responded yet, and stay silent for far-off events, finished
// meetings, all-day items, and when Calendar isn't connected.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) {
    return c.json({ items: [], generatedAt: new Date().toISOString() })
  }

  try {
    const { timeMin, timeMax } = todayRange(false)
    const events = await fetchCalendarEvents(workspaceId, {
      timeMin,
      timeMax,
      maxResults: 2500,
    })

    const now = Date.now()
    // The meeting happening right now or starting soonest, excluding ones the
    // user has already declined and all-day blocks (not "imminent" in any sense).
    const next = events
      .filter(
        (e) =>
          !e.isAllDay &&
          e.start &&
          e.end &&
          e.selfResponseStatus !== 'declined' &&
          Date.parse(e.end) > now,
      )
      .sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!))[0]

    if (!next || !next.start || !next.end) {
      return c.json({ items: [], generatedAt: new Date().toISOString() })
    }

    const startMs = Date.parse(next.start)
    const minsUntil = Math.round((startMs - now) / 60000)
    const inProgress = startMs <= now && Date.parse(next.end) > now

    // Quiet unless the meeting is imminent (≤20 min out) or already running.
    if (!inProgress && minsUntil > 20) {
      return c.json({ items: [], generatedAt: new Date().toISOString() })
    }

    const timeLabel = new Date(startMs).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
    const title = next.title ?? 'Untitled event'

    const when = inProgress
      ? 'now'
      : minsUntil <= 0
        ? 'now'
        : `in ${minsUntil} min`

    const actions: unknown[] = []

    // Richest action first: jump straight into the video call.
    if (next.conferenceUrl) {
      actions.push({
        type: 'open-app',
        label: 'Join',
        deepLink: next.conferenceUrl,
      })
    }

    // If you haven't responded, let you accept in place via the app's own RPC.
    if (next.id && next.selfResponseStatus === 'needsAction') {
      actions.push({
        type: 'rpc',
        label: 'Accept',
        method: 'calendar.events.rsvp',
        params: {
          accountId: next.accountId,
          eventId: next.id,
          responseStatus: 'accepted',
        },
      })
    }

    // Fallback to opening the event in Google Calendar.
    actions.push({
      type: 'open-app',
      label: actions.length ? 'View' : 'View event',
      ...(next.link ? { deepLink: next.link } : {}),
    })

    const eventSubtitle =
      next.location ??
      (next.conferenceUrl ? `Video call · ${timeLabel}` : timeLabel)
    const subtitle = next.accountEmailAddress
      ? `${next.accountEmailAddress} · ${eventSubtitle}`
      : eventSubtitle

    const item = {
      id: `event:${next.accountId ?? 'active'}:${next.id}`,
      kind: 'timely',
      surface: 'nudge',
      title: `${title} ${when}`,
      subtitle,
      icon: '📅',
      priority: inProgress ? 96 : 92,
      actions,
    }

    return c.json({ items: [item], generatedAt: new Date().toISOString() })
  } catch {
    // Not connected / transient error → stay quiet.
    return c.json({ items: [], generatedAt: new Date().toISOString() })
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)
  return c.json(await readUiIntent(workspaceId))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) return c.json(workspaceRequiredResponse(), 400)
  const id = c.req.query('id')
  if (!id) {
    return c.json(
      {
        ok: false,
        error: { code: 'intent_id_required', message: 'id is required.' },
      },
      400,
    )
  }
  const current = await readUiIntent(workspaceId)
  const deleted = current?.id === id
  if (deleted) await writeJson(uiIntentPath(workspaceId), null)
  return c.json({ ok: true, deleted })
})

app.post('/api/moldable/rpc', async (c) => {
  if (!isBrokerRpcRequest(c.req.raw)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'broker_required',
          message: 'Calendar RPC must be invoked through Moldable.',
        },
      },
      403,
    )
  }

  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) {
    return c.json(workspaceRequiredResponse(), 400)
  }

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const rawParams = body.params ?? undefined

    if (body.method === 'calendar.cards.present') {
      const input = eventGetParamsSchema.parse(rawParams)
      return c.json({
        ok: true,
        result: {
          appCard: {
            version: 1,
            title: 'Calendar event',
            resourcePath: '/index.html?card=event',
            input,
            readMethod: 'calendar.events.get',
            actions: [],
            height: 320,
          },
        },
      })
    }

    if (body.method === 'calendar.ui.describe') {
      uiDescribeParamsSchema.parse(rawParams)
      return c.json({
        ok: true,
        result: {
          views: CALENDAR_UI_DESCRIPTIONS,
          entities: 'Dates use YYYY-MM-DD; months use YYYY-MM.',
        },
      })
    }

    if (body.method === 'calendar.ui.navigate') {
      const params = uiNavigateParamsSchema.parse(rawParams)
      const entityId = resolveUiTarget(params)
      const intent = await writeUiIntent(
        workspaceId,
        params.view,
        entityId,
        params.params,
      )
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'calendar.ui.showDay') {
      const params = showDayParamsSchema.parse(rawParams)
      const intent = await writeUiIntent(workspaceId, 'day', params.date)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'calendar.ui.showMonth') {
      const params = showMonthParamsSchema.parse(rawParams)
      const intent = await writeUiIntent(workspaceId, 'month', params.month)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'calendar.ui.read') {
      const params = uiReadParamsSchema.parse(rawParams) ?? {}
      const view =
        params.view ?? (params.entityId?.length === 7 ? 'month' : 'day')
      const entityId = resolveUiTarget({
        view,
        entityId:
          params.entityId ??
          (view === 'day'
            ? new Date().toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 7)),
      })
      const range = calendarReadRange(view, entityId)
      try {
        const events = await fetchCalendarEvents(workspaceId, {
          accountId: params.accountId,
          ...range,
          includeDeclined: true,
          maxResults: 2500,
        })
        return c.json({
          ok: true,
          result: { view, entityId, ...range, connected: true, events },
        })
      } catch (error) {
        if (
          (error instanceof Error && error.name === 'CalendarNotConnected') ||
          isCalendarAuthError(error)
        ) {
          return c.json({
            ok: true,
            result: {
              view,
              entityId,
              ...range,
              connected: false,
              events: [],
            },
          })
        }
        throw error
      }
    }

    if (body.method === 'calendar.events.today') {
      const params = eventsListParamsSchema.parse(rawParams)
      const { timeMin, timeMax } = todayRange(params?.onlyFuture ?? true)
      const events = await fetchCalendarEvents(workspaceId, {
        accountId: params?.accountId,
        timeMin,
        timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({
        ok: true,
        result: filterEventsByQuery(events, params?.query),
      })
    }

    if (body.method === 'calendar.native.events') {
      const params = nativeEventsParamsSchema.parse(rawParams)
      const now = new Date()
      if (params.view === 'picker') {
        const minimum = new Date(now)
        minimum.setDate(minimum.getDate() - 90)
        const maximum = new Date(now)
        maximum.setDate(maximum.getDate() + 90)
        return c.json({
          ok: true,
          result: {
            selectedDate: calendarDateValue(now),
            minimumDate: calendarDateValue(minimum),
            maximumDate: calendarDateValue(maximum),
          },
        })
      }
      let timeMin: string | undefined
      let timeMax: string | undefined

      if (params.view === 'today') {
        const range = todayRange(false)
        timeMin = range.timeMin
        timeMax = range.timeMax
      } else if (params.view === 'upcoming') {
        const end = new Date(now)
        end.setDate(end.getDate() + (params.days ?? 14))
        timeMin = now.toISOString()
        timeMax = end.toISOString()
      } else if (params.view === 'range') {
        timeMin = params.timeMin
        timeMax = params.timeMax
      } else if (params.view === 'day') {
        const range = calendarReadRange('day', params.date!)
        timeMin = range.timeMin
        timeMax = range.timeMax
      }

      try {
        const events = filterEventsByQuery(
          await fetchCalendarEvents(workspaceId, {
            accountId: params.accountId,
            timeMin,
            timeMax,
            includeDeclined: true,
            maxResults: params.maxResults ?? 50,
          }),
          params.query,
        ).map(nativeCalendarEventSummary)
        const emptyTitle =
          params.view === 'search'
            ? 'No matching events'
            : params.view === 'upcoming'
              ? 'Nothing coming up'
              : 'No events scheduled'
        return c.json({
          ok: true,
          result: {
            connected: true,
            events,
            subtitle: `${events.length} ${events.length === 1 ? 'event' : 'events'}`,
            emptyStates:
              events.length === 0
                ? [
                    {
                      title: emptyTitle,
                      description:
                        params.view === 'search'
                          ? 'Try another title, guest, or location.'
                          : 'Your calendar is clear for this period.',
                    },
                  ]
                : [],
          },
        })
      } catch (error) {
        if (
          (error instanceof Error && error.name === 'CalendarNotConnected') ||
          isCalendarAuthError(error)
        ) {
          return c.json({
            ok: true,
            result: {
              connected: false,
              events: [],
              subtitle: 'Calendar needs attention',
              emptyStates: [
                {
                  title: 'Connect Calendar on your Mac',
                  description:
                    'Open Calendar on desktop to reconnect your Google account.',
                },
              ],
            },
          })
        }
        throw error
      }
    }

    if (body.method === 'calendar.events.upcoming') {
      const upcomingParams = upcomingEventsParamsSchema.parse(rawParams)
      const now = new Date()
      const end = new Date(now)
      end.setDate(end.getDate() + (upcomingParams?.days ?? 7))
      const events = await fetchCalendarEvents(workspaceId, {
        accountId: upcomingParams?.accountId,
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        includeDeclined: upcomingParams?.includeDeclined,
        maxResults: upcomingParams?.maxResults,
      })

      return c.json({ ok: true, result: events })
    }

    if (
      body.method === 'calendar.events.list' ||
      body.method === 'calendar.events.search'
    ) {
      const params = eventsListParamsSchema.parse(rawParams)
      const events = await fetchCalendarEvents(workspaceId, {
        accountId: params?.accountId,
        timeMin: params?.timeMin,
        timeMax: params?.timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({
        ok: true,
        result: filterEventsByQuery(events, params?.query),
      })
    }

    if (body.method === 'calendar.events.get') {
      const eventParams = eventGetParamsSchema.parse(rawParams)
      const found = await fetchEventById(
        workspaceId,
        eventParams.id,
        eventParams.accountId,
      )

      if (!found.event.id) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'event_not_found',
              message: `Calendar event ${eventParams.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({
        ok: true,
        result: nativeCalendarEvent(mapGoogleEvent(found.event, found.account)),
      })
    }

    if (body.method === 'calendar.events.findByICalUid') {
      const eventParams = eventFindByICalUidParamsSchema.parse(rawParams)
      const found = await findGoogleEventByICalUid(
        workspaceId,
        eventParams.iCalUid,
        eventParams.accountId,
      )

      return c.json({
        ok: true,
        result: found ? mapGoogleEvent(found.event, found.account) : null,
      })
    }

    if (body.method === 'calendar.events.create') {
      const eventParams = eventCreateParamsSchema.parse(rawParams)
      const created = await createGoogleEvent(workspaceId, eventParams)

      return c.json({
        ok: true,
        result: mapGoogleEvent(created.event, created.account),
      })
    }

    if (body.method === 'calendar.events.recurring.instances') {
      const eventParams = recurringInstancesParamsSchema.parse(rawParams)
      return c.json({
        ok: true,
        result: await fetchRecurringInstances(workspaceId, eventParams),
      })
    }

    if (body.method === 'calendar.events.update') {
      const eventParams = recurringEventUpdateParamsSchema.parse(rawParams)
      const updated = await updateRecurringGoogleEvent(workspaceId, eventParams)
      return c.json({
        ok: true,
        result: mapGoogleEvent(updated.event, updated.account),
      })
    }

    if (body.method === 'calendar.events.delete') {
      const eventParams = recurringEventDeleteParamsSchema.parse(rawParams)
      return c.json({
        ok: true,
        result: await deleteRecurringGoogleEvent(workspaceId, eventParams),
      })
    }

    if (body.method === 'calendar.events.invitees.add') {
      const params = eventInviteesAddParamsSchema.parse(rawParams)
      const updated = await mutateGoogleEventInvitees(workspaceId, {
        accountId: params.accountId,
        eventId: params.eventId,
        iCalUid: params.iCalUid,
        scope: params.scope,
        add: params.attendees,
        sendUpdates: params.sendUpdates,
      })

      return c.json({
        ok: true,
        result: mapGoogleEvent(updated.event, updated.account),
      })
    }

    if (body.method === 'calendar.events.invitees.update') {
      const params = eventInviteesUpdateParamsSchema.parse(rawParams)
      const updated = await mutateGoogleEventInvitees(workspaceId, {
        accountId: params.accountId,
        eventId: params.eventId,
        iCalUid: params.iCalUid,
        scope: params.scope,
        update: params.attendees,
        sendUpdates: params.sendUpdates,
      })

      return c.json({
        ok: true,
        result: mapGoogleEvent(updated.event, updated.account),
      })
    }

    if (body.method === 'calendar.events.invitees.remove') {
      const params = eventInviteesRemoveParamsSchema.parse(rawParams)
      const updated = await mutateGoogleEventInvitees(workspaceId, {
        accountId: params.accountId,
        eventId: params.eventId,
        iCalUid: params.iCalUid,
        scope: params.scope,
        remove: params.emails,
        sendUpdates: params.sendUpdates,
      })

      return c.json({
        ok: true,
        result: mapGoogleEvent(updated.event, updated.account),
      })
    }

    if (body.method === 'calendar.events.rsvp') {
      const eventParams = eventRsvpParamsSchema.parse(rawParams)
      const updated = await rsvpToGoogleEvent(workspaceId, eventParams)

      return c.json({
        ok: true,
        result: mapGoogleEvent(updated.event, updated.account),
      })
    }

    if (body.method === 'calendar.status') {
      const state = await getCalendarAccountsState(workspaceId)
      const accounts = await Promise.all(
        state.accounts.map(async (account) => ({
          id: account.accountId,
          emailAddress: account.emailAddress,
          authenticated: await isAuthenticated(
            workspaceId,
            account.accountId,
          ).catch(() => false),
        })),
      )
      return c.json({
        ok: true,
        result: {
          connected: accounts.some((account) => account.authenticated),
          accounts,
          activeAccountId: state.activeAccountId,
        },
      })
    }

    if (body.method === 'calendar.calendars.list') {
      const params = z
        .object({ accountId: z.string().trim().min(1).optional() })
        .optional()
        .parse(rawParams)
      return c.json({
        ok: true,
        result: await fetchCalendarList(workspaceId, params?.accountId),
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Calendar does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'CalendarEventNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'event_not_found',
            message: 'Calendar event was not found.',
          },
        },
        404,
      )
    }

    if (error instanceof Error && error.name === 'CalendarInviteeNotFound') {
      return c.json(
        {
          ok: false,
          error: { code: 'invitee_not_found', message: error.message },
        },
        404,
      )
    }

    if (
      error instanceof Error &&
      ['CalendarProtectedInvitee', 'CalendarInviteeConflict'].includes(
        error.name,
      )
    ) {
      return c.json(
        {
          ok: false,
          error: { code: 'invitee_conflict', message: error.message },
        },
        409,
      )
    }

    if (error instanceof Error && error.name === 'CalendarAttendeeNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'attendee_not_found',
            message:
              'Calendar could not find your attendee record for this event.',
          },
        },
        409,
      )
    }

    if (
      error instanceof Error &&
      [
        'CalendarRecurringInstanceRequired',
        'CalendarRecurringSeriesRequired',
        'CalendarRecurringScopeConflict',
      ].includes(error.name)
    ) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'recurring_event_scope_conflict',
            message: error.message,
          },
        },
        409,
      )
    }

    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
      return c.json({
        ok: false,
        error: {
          code: 'calendar_not_connected',
          message: 'Connect Calendar before other apps can show events.',
        },
      })
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Calendar received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    const candidate = error as {
      status?: number
      response?: { status?: number }
    }
    if (candidate.status === 403 || candidate.response?.status === 403) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invitees_forbidden',
            message: 'Only an event organizer can change its invitees.',
          },
        },
        403,
      )
    }

    console.error('Calendar RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'calendar_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Calendar could not complete the request.',
        },
      },
      500,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
