import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MapPin,
  MoreHorizontal,
  Repeat2,
  RotateCw,
  Search,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppFrameContent,
  AppHeader,
  AppShell,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarControlGroup,
  ToolbarIconButton,
  useMoldablePlatform,
  useWorkspace,
} from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import { InviteeEditor } from './components/invitee-editor'
import { MobileCalendarHeader } from './components/mobile-calendar-header'
import { MobileCalendarView } from './components/mobile-calendar-view'
import { ResizableRightPanel } from './components/resizable-right-panel'
import {
  CalendarTimeGrid,
  type TimeGridMode,
  type TimeGridRenderContext,
} from './components/time-grid-view'
import type { CalendarUiIntent } from '../shared/ui-intent'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { z } from 'zod'

type ResponseStatus = 'accepted' | 'tentative' | 'declined' | 'needsAction'
type CalendarView = TimeGridMode | 'month'

interface Attendee {
  email?: string | null
  displayName?: string | null
  responseStatus?: string | null
  optional?: boolean | null
  organizer?: boolean | null
  self?: boolean | null
}

interface CalendarEvent {
  id: string
  accountId?: string
  accountEmailAddress?: string
  iCalUID?: string
  title: string
  start: string
  end: string
  isAllDay?: boolean
  location?: string
  link?: string
  status?: string
  colorId?: string
  organizer?: {
    email?: string | null
    displayName?: string | null
    self?: boolean | null
  } | null
  attendees?: Attendee[]
  selfResponseStatus?: string | null
  conferenceUrl?: string | null
  conferenceProvider?: string | null
  recurrence?: string[] | null
  recurringEventId?: string | null
  originalStartTime?: string | null
  // Derived client-side.
  isPastEvent?: boolean
}

interface CalendarAccount {
  id: string
  emailAddress: string
  authenticated?: boolean
}

interface CalendarStatus {
  authenticated: boolean
  activeAccountId: string | null
  accounts: CalendarAccount[]
}

// Google Calendar colorId mapping (standard colors). These are *data* — the hue
// belongs to the event — while all surrounding surfaces use design-system tokens.
const GOOGLE_COLORS: Record<string, string> = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#fbc02d', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const EVENTS_STALE_TIME_MS = 5 * 60 * 1000
const EVENTS_GC_TIME_MS = 60 * 60 * 1000
const DEFAULT_MONTH_INSPECTOR_WIDTH = 272
const MIN_MONTH_INSPECTOR_WIDTH = 224
const MAX_MONTH_INSPECTOR_WIDTH = 480

interface CalendarPreferences {
  monthInspectorWidth?: number
}

interface CalendarRange {
  start: Date
  end: Date
}

function visibleRangeForMonth(month: Date): CalendarRange {
  return {
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }
}

function daysForMonth(month: Date): Date[] {
  const monthStart = startOfMonth(month)
  return eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  })
}

function eventsQueryKey(
  workspaceId: string,
  accountId: string | null,
  range: CalendarRange,
) {
  return [
    'events',
    workspaceId,
    accountId ?? 'all',
    range.start.toISOString(),
    range.end.toISOString(),
  ] as const
}

const attendeeSchema = z.object({
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  responseStatus: z.string().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  organizer: z.boolean().nullable().optional(),
  self: z.boolean().nullable().optional(),
})

const apiEventSchema = z.object({
  id: z.string().nullable().optional(),
  accountId: z.string().optional(),
  accountEmailAddress: z.string().optional(),
  iCalUID: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
  location: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  colorId: z.string().nullable().optional(),
  organizer: z
    .object({
      email: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      self: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  attendees: z.array(attendeeSchema).optional(),
  selfResponseStatus: z.string().nullable().optional(),
  conferenceUrl: z.string().nullable().optional(),
  conferenceProvider: z.string().nullable().optional(),
  recurrence: z.array(z.string()).nullable().optional(),
  recurringEventId: z.string().nullable().optional(),
  originalStartTime: z.string().nullable().optional(),
})

// All-day events arrive as a date-only string ('2026-05-29'). parseISO would
// read that as local midnight and can drift across timezones; parse the raw
// y-M-d into a local date so the event lands on the intended calendar cell.
function parseEventDay(event: Pick<CalendarEvent, 'start' | 'isAllDay'>): Date {
  if (event.isAllDay && DATE_ONLY_RE.test(event.start)) {
    return parse(event.start, 'yyyy-MM-dd', new Date())
  }
  return parseISO(event.start)
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

function isValidEventRange(
  event: Pick<CalendarEvent, 'start' | 'end' | 'isAllDay'>,
) {
  if (event.isAllDay) {
    return (
      DATE_ONLY_RE.test(event.start) &&
      DATE_ONLY_RE.test(event.end) &&
      isValidDate(parseEventDay(event))
    )
  }

  return isValidDate(parseISO(event.start)) && isValidDate(parseISO(event.end))
}

function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  if (!event.isAllDay) {
    const start = parseISO(event.start)
    const end = parseISO(event.end)
    if (!isValidDate(start) || !isValidDate(end)) return false

    const dayStart = startOfDay(day)
    const nextDay = addDays(dayStart, 1)
    return start < nextDay && end > dayStart
  }

  const start = startOfDay(parseEventDay(event))
  const end =
    event.end && DATE_ONLY_RE.test(event.end)
      ? startOfDay(parse(event.end, 'yyyy-MM-dd', new Date()))
      : start

  const inclusiveEnd = new Date(end)
  if (inclusiveEnd > start) {
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1)
  }

  const target = startOfDay(day).getTime()
  return target >= start.getTime() && target <= inclusiveEnd.getTime()
}

function eventSortTime(event: CalendarEvent): number {
  return event.isAllDay
    ? parseEventDay(event).getTime()
    : parseISO(event.start).getTime()
}

function calendarEventKey(event: CalendarEvent) {
  return `${event.accountId ?? 'active'}:${event.id}`
}

function normalizeCalendarEvents(value: unknown): CalendarEvent[] {
  const parsed = z.array(apiEventSchema).safeParse(value)
  if (!parsed.success) return []

  return parsed.data.flatMap((event): CalendarEvent[] => {
    if (!event.id || !event.start || !event.end) return []

    const normalized: CalendarEvent = {
      id: event.id,
      accountId: event.accountId,
      accountEmailAddress: event.accountEmailAddress,
      iCalUID: event.iCalUID ?? undefined,
      title: event.title ?? 'Untitled event',
      start: event.start,
      end: event.end,
      isAllDay: event.isAllDay,
      location: event.location ?? undefined,
      link: event.link ?? undefined,
      status: event.status ?? undefined,
      colorId: event.colorId ?? undefined,
      organizer: event.organizer ?? undefined,
      attendees: event.attendees,
      selfResponseStatus: event.selfResponseStatus ?? undefined,
      conferenceUrl: event.conferenceUrl ?? undefined,
      conferenceProvider: event.conferenceProvider ?? undefined,
      recurrence: event.recurrence ?? undefined,
      recurringEventId: event.recurringEventId ?? undefined,
      originalStartTime: event.originalStartTime ?? undefined,
    }

    return isValidEventRange(normalized) ? [normalized] : []
  })
}

function eventColor(event: CalendarEvent): string | null {
  return event.colorId ? (GOOGLE_COLORS[event.colorId] ?? null) : null
}

function compactLocationLabel(location: string): string {
  try {
    const hostname = new URL(location).hostname.replace(/^www\./, '')
    if (hostname === 'meet.google.com') return 'Google Meet'
    if (hostname.endsWith('zoom.us')) return 'Zoom'
    if (hostname.includes('teams.microsoft.com')) return 'Microsoft Teams'
    return hostname
  } catch {
    return location
  }
}

function calendarRecurrenceLabel(event: CalendarEvent): string | null {
  const rule = event.recurrence?.find((item) => item.startsWith('RRULE:'))
  if (!rule) return event.recurringEventId ? 'Recurring event' : null

  const frequency = /(?:^RRULE:|;)FREQ=([A-Z]+)/.exec(rule)?.[1]
  const interval = Number(/(?:^|;)INTERVAL=(\d+)/.exec(rule)?.[1] ?? '1')
  const unit =
    frequency === 'DAILY'
      ? 'day'
      : frequency === 'WEEKLY'
        ? 'week'
        : frequency === 'MONTHLY'
          ? 'month'
          : frequency === 'YEARLY'
            ? 'year'
            : null
  if (!unit) return 'Recurring event'
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`
}

export default function FullPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  )
  const [hiddenAccountIds, setHiddenAccountIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [calendarsExpanded, setCalendarsExpanded] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [miniMonth, setMiniMonth] = useState(new Date())
  const [monthInspectorDate, setMonthInspectorDate] = useState<Date | null>(
    null,
  )
  const [monthInspectorWidth, setMonthInspectorWidth] = useState(
    DEFAULT_MONTH_INSPECTOR_WIDTH,
  )
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null)
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileCalendarsOpen, setMobileCalendarsOpen] = useState(false)
  const [mobileMonthExpanded, setMobileMonthExpanded] = useState(true)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const queryClient = useQueryClient()
  const touchStartRef = useRef<number | null>(null)
  const seenIntentIds = useRef<Set<string>>(new Set())
  const oauthPollTimerRef = useRef<number | null>(null)
  const oauthPollGenerationRef = useRef(0)

  const preferencesQuery = useQuery({
    queryKey: ['calendar-preferences', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/preferences')
      if (!response.ok) throw new Error('Failed to load Calendar preferences')
      return (await response.json()) as CalendarPreferences
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  useEffect(() => {
    const storedWidth = preferencesQuery.data?.monthInspectorWidth
    if (typeof storedWidth !== 'number') return
    setMonthInspectorWidth(
      Math.min(
        MAX_MONTH_INSPECTOR_WIDTH,
        Math.max(MIN_MONTH_INSPECTOR_WIDTH, storedWidth),
      ),
    )
  }, [preferencesQuery.data?.monthInspectorWidth])

  const saveMonthInspectorWidth = useCallback(
    (width: number) => {
      void fetchWithWorkspace('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthInspectorWidth: Math.round(width) }),
      })
        .then((response) => {
          if (!response.ok) return
          queryClient.setQueryData<CalendarPreferences>(
            ['calendar-preferences', workspaceId],
            (current) => ({
              ...current,
              monthInspectorWidth: Math.round(width),
            }),
          )
        })
        .catch(() => {
          // Resizing remains useful even when preference persistence is offline.
        })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const statusQuery = useQuery({
    queryKey: ['calendar-status', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/status', {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Failed to load Calendar status')
      return (await response.json()) as CalendarStatus
    },
    refetchInterval: (query) =>
      query.state.data?.authenticated ? false : 2_000,
    refetchIntervalInBackground: true,
  })
  const accounts = useMemo(
    () => statusQuery.data?.accounts ?? [],
    [statusQuery.data?.accounts],
  )
  const calendarScopeAccountId =
    accounts.length > 1
      ? selectedAccountId
      : (accounts[0]?.id ?? statusQuery.data?.activeAccountId ?? null)
  const authenticated = statusQuery.data?.authenticated === true

  useEffect(() => {
    if (
      selectedAccountId &&
      !accounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId(null)
    }

    setHiddenAccountIds((current) => {
      const accountIds = new Set(accounts.map((account) => account.id))
      const next = new Set(
        [...current].filter((accountId) => accountIds.has(accountId)),
      )
      return next.size === current.size ? current : next
    })
  }, [accounts, selectedAccountId])

  const visibleRange = useMemo(
    () => visibleRangeForMonth(currentMonth),
    [currentMonth],
  )

  const fetchEventsForRange = useCallback(
    async (range: CalendarRange) => {
      const params = new URLSearchParams({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
      })
      if (calendarScopeAccountId) {
        params.set('accountId', calendarScopeAccountId)
      } else {
        params.set('scope', 'all')
      }
      const res = await fetchWithWorkspace(`/api/events?${params.toString()}`)
      if (res.status === 401) {
        await queryClient.invalidateQueries({
          queryKey: ['calendar-status', workspaceId],
        })
        throw new Error('Unauthorized')
      }
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      return normalizeCalendarEvents(data.events)
    },
    [calendarScopeAccountId, fetchWithWorkspace, queryClient, workspaceId],
  )

  const {
    data: eventsData,
    isLoading: queryLoading,
    isPlaceholderData,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: eventsQueryKey(workspaceId, calendarScopeAccountId, visibleRange),
    enabled: authenticated,
    queryFn: () => fetchEventsForRange(visibleRange),
    placeholderData: keepPreviousData,
    staleTime: EVENTS_STALE_TIME_MS,
    gcTime: EVENTS_GC_TIME_MS,
    retry: false,
  })

  const events = useMemo(() => {
    const loadedEvents = eventsData ?? []
    if (hiddenAccountIds.size === 0) return loadedEvents

    return loadedEvents.filter((event) => {
      const accountId = event.accountId ?? calendarScopeAccountId
      return !accountId || !hiddenAccountIds.has(accountId)
    })
  }, [calendarScopeAccountId, eventsData, hiddenAccountIds])
  const shellLoading = statusQuery.isLoading && !statusQuery.data
  const calendarDataPending =
    authenticated &&
    (isPlaceholderData || (queryLoading && eventsData === undefined))
  // An account-specific authorization failure remains visible so the account
  // can be reconnected or disconnected from the shared account selector.
  const isAuthError =
    queryError instanceof Error && queryError.message === 'Unauthorized'
  const loadError =
    statusQuery.error ??
    (queryError && (!isAuthError || authenticated) ? queryError : null)
  const showErrorBanner = Boolean(loadError) && !errorDismissed
  const showConnectScreen =
    !authenticated && (isAuthError || (statusQuery.isSuccess && !loadError))

  useEffect(() => {
    if (!authenticated || eventsData === undefined || isPlaceholderData) return

    for (const adjacentMonth of [
      subMonths(currentMonth, 1),
      addMonths(currentMonth, 1),
    ]) {
      const range = visibleRangeForMonth(adjacentMonth)
      void queryClient.prefetchQuery({
        queryKey: eventsQueryKey(workspaceId, calendarScopeAccountId, range),
        queryFn: () => fetchEventsForRange(range),
        staleTime: EVENTS_STALE_TIME_MS,
        gcTime: EVENTS_GC_TIME_MS,
      })
    }
  }, [
    authenticated,
    calendarScopeAccountId,
    currentMonth,
    eventsData,
    fetchEventsForRange,
    isPlaceholderData,
    queryClient,
    workspaceId,
  ])

  useEffect(() => {
    if (queryError || statusQuery.error) setErrorDismissed(false)
  }, [queryError, statusQuery.error])

  const navigateToDate = useCallback(
    (day: Date) => {
      setSelectedDate(day)
      if (calendarView !== 'month' || !isSameMonth(day, currentMonth)) {
        setCurrentMonth(day)
      }
      setMiniMonth(day)
    },
    [calendarView, currentMonth],
  )

  const selectDate = useCallback(
    (day: Date) => {
      navigateToDate(day)
      if (calendarView === 'month') setMonthInspectorDate(day)
    },
    [calendarView, navigateToDate],
  )

  const selectMobileDate = useCallback(
    (day: Date) => {
      navigateToDate(day)
      if (calendarView !== 'month') setMobileMonthExpanded(false)
    },
    [calendarView, navigateToDate],
  )

  const consumeUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as CalendarUiIntent | null
    if (!intent || seenIntentIds.current.has(intent.id)) return

    if (intent.view === 'day') {
      const day = parse(intent.entityId, 'yyyy-MM-dd', new Date())
      setCalendarView('day')
      setMonthInspectorDate(null)
      setSelectedDate(day)
      setCurrentMonth(day)
      setMiniMonth(day)
    } else {
      const month = parse(`${intent.entityId}-01`, 'yyyy-MM-dd', new Date())
      setCalendarView('month')
      setCurrentMonth(month)
      setSelectedDate(month)
      setMiniMonth(month)
      setMonthInspectorDate(null)
    }

    seenIntentIds.current.add(intent.id)
    await fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    )
  }, [fetchWithWorkspace])

  useEffect(() => {
    void consumeUiIntent()
    const handleDriveMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        workspaceId?: string
        targetAppId?: string
        method?: string
      }
      if (data.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'calendar' || data.workspaceId !== workspaceId)
        return
      if (data.method?.startsWith('calendar.')) {
        void queryClient.invalidateQueries({
          queryKey: ['events', workspaceId],
        })
      }
      void consumeUiIntent()
    }
    window.addEventListener('message', handleDriveMessage)
    return () => window.removeEventListener('message', handleDriveMessage)
  }, [consumeUiIntent, queryClient, workspaceId])

  const stopOauthPolling = useCallback(() => {
    oauthPollGenerationRef.current += 1
    if (oauthPollTimerRef.current !== null) {
      window.clearTimeout(oauthPollTimerRef.current)
      oauthPollTimerRef.current = null
    }
  }, [])

  useEffect(() => stopOauthPolling, [stopOauthPolling, workspaceId])

  const readLatestStatus = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/status', {
      cache: 'no-store',
    })
    if (!response.ok) return undefined
    const status = (await response.json()) as CalendarStatus
    queryClient.setQueryData(['calendar-status', workspaceId], status)
    return status
  }, [fetchWithWorkspace, queryClient, workspaceId])

  const statusFingerprint = useCallback(
    (status: CalendarStatus | undefined) => {
      if (!status) return ''
      return JSON.stringify({
        activeAccountId: status.activeAccountId,
        accounts: status.accounts
          .map((account) => ({
            id: account.id,
            authenticated: account.authenticated !== false,
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
      })
    },
    [],
  )

  const reconcileOauthCompletion = useCallback(
    (before: CalendarStatus | undefined) => {
      stopOauthPolling()
      const generation = oauthPollGenerationRef.current
      const beforeFingerprint = statusFingerprint(before)
      const deadline = Date.now() + 3 * 60_000

      const poll = async () => {
        const status = await readLatestStatus().catch(() => undefined)
        if (generation !== oauthPollGenerationRef.current) return
        if (status && statusFingerprint(status) !== beforeFingerprint) {
          stopOauthPolling()
          await queryClient.invalidateQueries({
            queryKey: ['events', workspaceId],
          })
          return
        }
        if (Date.now() >= deadline) {
          stopOauthPolling()
          return
        }
        oauthPollTimerRef.current = window.setTimeout(() => void poll(), 750)
      }

      oauthPollTimerRef.current = window.setTimeout(() => void poll(), 750)
    },
    [
      queryClient,
      readLatestStatus,
      statusFingerprint,
      stopOauthPolling,
      workspaceId,
    ],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'oauth-success') return
      stopOauthPolling()
      void readLatestStatus().then(() =>
        queryClient.invalidateQueries({ queryKey: ['events', workspaceId] }),
      )
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, readLatestStatus, stopOauthPolling, workspaceId])

  const handleConnect = async () => {
    setConnectLoading(true)
    setError(null)

    try {
      const before = await readLatestStatus().catch(() => statusQuery.data)
      const response = await fetchWithWorkspace('/api/auth/login')
      const data = (await response.json()) as {
        url?: string
        error?: string
        details?: string
      }

      if (!data.url)
        throw new Error(data.details || data.error || 'Failed to get auth URL')

      if (window.parent !== window) {
        window.parent.postMessage(
          { type: 'moldable:open-url', url: data.url },
          '*',
        )
      } else {
        window.open(data.url, '_blank')
      }
      reconcileOauthCompletion(before)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get auth URL')
    } finally {
      setConnectLoading(false)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetchWithWorkspace(
        `/api/auth/logout?accountId=${encodeURIComponent(accountId)}`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error('Failed to disconnect Calendar')
      if (selectedAccountId === accountId) setSelectedAccountId(null)
      setHiddenAccountIds((current) => {
        if (!current.has(accountId)) return current
        const next = new Set(current)
        next.delete(accountId)
        return next
      })
      queryClient.removeQueries({ queryKey: ['events', workspaceId] })
      await queryClient.invalidateQueries({
        queryKey: ['calendar-status', workspaceId],
      })
    } catch (err) {
      console.error('Failed to disconnect', err)
    }
  }

  const handleAccountSwitch = async (accountId: string | null) => {
    setSelectedAccountId(accountId)
    if (accountId) {
      setHiddenAccountIds((current) => {
        if (!current.has(accountId)) return current
        const next = new Set(current)
        next.delete(accountId)
        return next
      })
    }
    if (accountId && accountId !== statusQuery.data?.activeAccountId) {
      const response = await fetchWithWorkspace('/api/accounts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (response.ok) {
        await queryClient.invalidateQueries({
          queryKey: ['calendar-status', workspaceId],
        })
      }
    }
  }

  const toggleCalendarVisibility = useCallback((accountId: string) => {
    setHiddenAccountIds((current) => {
      const next = new Set(current)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }, [])

  const allCalendarsVisible = accounts.every(
    (account) => !hiddenAccountIds.has(account.id),
  )
  const toggleAllCalendars = useCallback(() => {
    setHiddenAccountIds((current) => {
      const currentlyAllVisible = accounts.every(
        (account) => !current.has(account.id),
      )
      return currentlyAllVisible
        ? new Set(accounts.map((account) => account.id))
        : new Set()
    })
  }, [accounts])

  const formatTime = (dateStr: string) => format(parseISO(dateStr), 'h:mm aa')

  const formatTimeRange = (start: string, end: string) =>
    `${formatTime(start)} – ${formatTime(end)}`

  const matchesSearch = useCallback(
    (event: CalendarEvent) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return [
        event.title,
        event.location,
        event.conferenceProvider,
        event.organizer?.displayName,
        event.organizer?.email,
        ...(event.attendees ?? []).flatMap((a) => [a.displayName, a.email]),
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
        .includes(q)
    },
    [search],
  )

  const displayedEvents = useMemo(() => {
    const now = new Date()
    return events.filter(matchesSearch).map((event) => ({
      ...event,
      isPastEvent:
        !event.isAllDay && parseISO(event.end).getTime() < now.getTime(),
    }))
  }, [events, matchesSearch])

  const dayEventsFor = useCallback(
    (day: Date) => {
      return displayedEvents
        .filter((e) => eventOccursOnDay(e, day))
        .sort((a, b) => {
          if (a.isAllDay && !b.isAllDay) return -1
          if (!a.isAllDay && b.isAllDay) return 1
          return eventSortTime(a) - eventSortTime(b)
        })
    },
    [displayedEvents],
  )

  const selectedDayEvents = useMemo(
    () => dayEventsFor(selectedDate),
    [dayEventsFor, selectedDate],
  )
  const allDayEvents = useMemo(
    () => selectedDayEvents.filter((e) => e.isAllDay),
    [selectedDayEvents],
  )
  const timedEvents = useMemo(
    () => selectedDayEvents.filter((e) => !e.isAllDay),
    [selectedDayEvents],
  )
  const monthInspectorEvents = useMemo(
    () => (monthInspectorDate ? dayEventsFor(monthInspectorDate) : []),
    [dayEventsFor, monthInspectorDate],
  )
  const monthInspectorAllDayEvents = useMemo(
    () => monthInspectorEvents.filter((event) => event.isAllDay),
    [monthInspectorEvents],
  )
  const monthInspectorTimedEvents = useMemo(
    () => monthInspectorEvents.filter((event) => !event.isAllDay),
    [monthInspectorEvents],
  )

  const calendarDays = useMemo(() => daysForMonth(currentMonth), [currentMonth])
  const miniCalendarDays = useMemo(() => daysForMonth(miniMonth), [miniMonth])

  const shiftVisiblePeriod = useCallback(
    (direction: 'next' | 'prev') => {
      setSlideDir(calendarView === 'month' ? direction : null)
      setMonthInspectorDate(null)
      const delta = direction === 'next' ? 1 : -1
      const next =
        calendarView === 'day'
          ? addDays(currentMonth, delta)
          : calendarView === 'week'
            ? direction === 'next'
              ? addWeeks(currentMonth, 1)
              : subWeeks(currentMonth, 1)
            : direction === 'next'
              ? addMonths(currentMonth, 1)
              : subMonths(currentMonth, 1)
      setCurrentMonth(next)
      setSelectedDate(next)
      setMiniMonth(next)
    },
    [calendarView, currentMonth],
  )
  const nextPeriod = useCallback(
    () => shiftVisiblePeriod('next'),
    [shiftVisiblePeriod],
  )
  const prevPeriod = useCallback(
    () => shiftVisiblePeriod('prev'),
    [shiftVisiblePeriod],
  )
  const goToToday = () => {
    const today = new Date()
    setSlideDir(
      calendarView === 'month'
        ? today > currentMonth
          ? 'next'
          : 'prev'
        : null,
    )
    setCurrentMonth(today)
    setSelectedDate(today)
    setMiniMonth(today)
    setMonthInspectorDate(null)
  }

  const handleViewChange = (view: CalendarView) => {
    setCalendarView(view)
    setMobileMonthExpanded(view === 'month')
    setCurrentMonth(selectedDate)
    setMiniMonth(selectedDate)
    setMonthInspectorDate(null)
  }

  // Re-arm the slide animation by toggling the data attribute each navigation.
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    if (slideDir) setAnimKey((k) => k + 1)
  }, [currentMonth, slideDir])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return
    const deltaX = touchStartRef.current - e.changedTouches[0].clientX
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) nextPeriod()
      else prevPeriod()
    }
    touchStartRef.current = null
  }

  // Keyboard navigation when the grid is focused — the accessible, discoverable
  // replacement for the old wheel-jacking. Wheel-to-change-month is removed so
  // the grid's own scrollbar works on busy months.
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault()
      prevPeriod()
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault()
      nextPeriod()
    }
  }

  const openExternalLink = (url: string) => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'moldable:open-url', url }, '*')
    } else {
      window.open(url, '_blank')
    }
  }

  if (shellLoading) {
    return <CalendarLoadingScreen />
  }

  if (showConnectScreen) {
    return (
      <AppShell title="Calendar" nativeMaterial={{ background: true }}>
        <AppFrameContent
          className="flex flex-col items-center justify-center p-8 text-center"
          style={{
            paddingBlockEnd:
              'calc(var(--window-content-inset-bottom, 0px) + var(--chat-safe-padding, 0px) + 2rem)',
          }}
        >
          <div className="bg-primary/10 mb-6 rounded-full p-4">
            <CalendarDays className="text-primary size-12" />
          </div>
          <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
            Calendar
          </h1>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Connect your Google Calendar to sync your meetings and see your
            daily agenda at a glance.
          </p>

          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive mb-4 rounded-lg border p-4 text-sm">
              {error}
            </div>
          )}

          {connectLoading ? (
            <Button size="lg" disabled className="gap-2">
              <Loader2 className="size-4 animate-spin" />
              Connecting...
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="flex h-10 cursor-pointer items-center gap-3 rounded-sm border border-[#747775] bg-white px-3 font-['Roboto',sans-serif] text-sm font-medium text-[#1f1f1f] shadow-sm transition-shadow hover:shadow-md active:bg-[#f8f8f8]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}

          <p className="text-muted-foreground mt-6 max-w-xs text-center text-xs">
            Your calendar data is stored locally on your device.{' '}
            <a
              href="https://moldable.sh/legal/privacy#7-google-api-services"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </AppFrameContent>
      </AppShell>
    )
  }

  return (
    <AppShell title="Calendar" nativeMaterial={{ background: true }}>
      <AppHeader
        title="Calendar"
        description={format(currentMonth, 'MMMM yyyy')}
        desktop={false}
        actions={[
          {
            id: 'calendar.today',
            label: 'Today',
            icon: CalendarIcon,
            placement: 'overflow',
            onPress: goToToday,
          },
          {
            id: 'calendar.calendars',
            label: 'Calendars',
            icon: CalendarDays,
            placement: 'overflow',
            onPress: () => setMobileCalendarsOpen(true),
          },
          {
            id: 'calendar.day',
            label: calendarView === 'day' ? 'Day view (selected)' : 'Day view',
            icon: calendarView === 'day' ? Check : CalendarIcon,
            placement: 'overflow',
            onPress: () => handleViewChange('day'),
          },
          {
            id: 'calendar.week',
            label:
              calendarView === 'week' ? 'Week view (selected)' : 'Week view',
            icon: calendarView === 'week' ? Check : CalendarIcon,
            placement: 'overflow',
            onPress: () => handleViewChange('week'),
          },
          {
            id: 'calendar.month',
            label:
              calendarView === 'month' ? 'Month view (selected)' : 'Month view',
            icon: calendarView === 'month' ? Check : CalendarIcon,
            placement: 'overflow',
            onPress: () => handleViewChange('month'),
          },
          {
            id: 'calendar.search',
            label: mobileSearchOpen ? 'Close search' : 'Search events',
            icon: Search,
            placement: 'overflow',
            onPress: () => setMobileSearchOpen((open) => !open),
          },
        ]}
        mobileControls={
          <div className="calendar-mobile-controls flex w-full min-w-0 flex-col gap-1.5">
            <MobileCalendarHeader
              month={currentMonth}
              view={calendarView}
              expanded={mobileMonthExpanded}
              onToggleExpanded={() =>
                setMobileMonthExpanded((expanded) => !expanded)
              }
              onPrevious={prevPeriod}
              onNext={nextPeriod}
            />
            {mobileSearchOpen ? (
              <div className="calendar-mobile-search flex min-w-0 items-center gap-1.5">
                <SearchField
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search events"
                  aria-label="Search events"
                  density="compact"
                  autoFocus
                  className="min-w-0 flex-1"
                />
                <IconButton
                  label="Close event search"
                  variant="toolbar"
                  onClick={() => setMobileSearchOpen(false)}
                  className="cursor-pointer"
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            ) : null}
          </div>
        }
      />
      <MobileCalendarAccountSheet
        open={mobileCalendarsOpen}
        onOpenChange={setMobileCalendarsOpen}
        accounts={accounts}
        activeAccountId={statusQuery.data?.activeAccountId ?? null}
        selectedAccountId={calendarScopeAccountId}
        disabled={connectLoading}
        onAddAccount={() => void handleConnect()}
        onChange={(accountId) => void handleAccountSwitch(accountId)}
        onDisconnect={(accountId) => void handleDisconnect(accountId)}
      />
      <AppFrameContent
        scrollable={false}
        chatSafe={false}
        className="calendar-frame flex flex-row p-0"
      >
        <aside className="calendar-agenda border-border flex min-h-0 flex-col border-r">
          <div className="calendar-sidebar-desktop border-border space-y-4 border-b px-3 pb-4 pt-[calc(var(--window-titlebar-height,0px)+0.75rem)]">
            <MiniMonthCalendar
              month={miniMonth}
              selectedDate={selectedDate}
              days={miniCalendarDays}
              onPrevious={() => setMiniMonth((month) => subMonths(month, 1))}
              onNext={() => setMiniMonth((month) => addMonths(month, 1))}
              onSelect={selectDate}
            />

            <SearchField
              value={search}
              onValueChange={setSearch}
              placeholder="Search events"
              aria-label="Search events"
              density="compact"
              className="w-full"
            />

            <div className="space-y-1">
              <div className="flex h-7 items-center justify-between px-1.5">
                <button
                  type="button"
                  aria-expanded={calendarsExpanded}
                  onClick={() => setCalendarsExpanded((expanded) => !expanded)}
                  className="text-foreground hover:text-foreground/80 -ml-1 flex h-7 cursor-pointer items-center gap-1 rounded-md pr-1 text-xs font-semibold transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground size-3.5 transition-transform',
                      calendarsExpanded && 'rotate-90',
                    )}
                  />
                  Calendars
                </button>
                <CalendarAccountMenu
                  accounts={accounts}
                  activeAccountId={statusQuery.data?.activeAccountId ?? null}
                  selectedAccountId={calendarScopeAccountId}
                  disabled={connectLoading}
                  onAddAccount={() => void handleConnect()}
                  onChange={(accountId) => void handleAccountSwitch(accountId)}
                  onDisconnect={(accountId) => void handleDisconnect(accountId)}
                  iconOnly
                />
              </div>
              {calendarsExpanded ? (
                <div className="calendar-list-scroll max-h-32 space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {accounts.length > 1 ? (
                    <CalendarScopeButton
                      label="All calendars"
                      selected={allCalendarsVisible}
                      onClick={toggleAllCalendars}
                    />
                  ) : null}
                  {accounts.map((account) => (
                    <CalendarScopeButton
                      key={account.id}
                      label={account.emailAddress}
                      selected={!hiddenAccountIds.has(account.id)}
                      onClick={() => toggleCalendarVisibility(account.id)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleConnect()}
                    className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-xs transition-colors"
                  >
                    <UserPlus className="size-3.5" />
                    <span className="truncate">Add calendar account</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="calendar-mobile-agenda min-h-0 flex-1">
            <MobileCalendarView
              view={calendarView}
              anchorDate={currentMonth}
              selectedDate={selectedDate}
              monthDays={calendarDays}
              monthOverviewExpanded={mobileMonthExpanded}
              loading={calendarDataPending}
              eventsForDay={dayEventsFor}
              eventKey={calendarEventKey}
              eventColor={eventColor}
              onSelectDate={selectMobileDate}
              agenda={
                <SelectedDayAgenda
                  selectedDate={selectedDate}
                  allDayEvents={allDayEvents}
                  timedEvents={timedEvents}
                  loading={calendarDataPending}
                  formatTimeRange={formatTimeRange}
                  openExternalLink={openExternalLink}
                />
              }
            />
          </div>
        </aside>

        {/* Grid column */}
        <div className="calendar-grid-column flex min-w-0 flex-1 flex-col overflow-hidden">
          <Toolbar
            position="top"
            variant="plain"
            material="none"
            inset="none"
            className="calendar-main-header border-border relative shrink-0 gap-2 border-b"
            style={{
              minHeight:
                'max(var(--density-toolbar-height, 2rem), var(--window-titlebar-height, 0px))',
            }}
          >
            <h1 className="text-foreground min-w-0 truncate text-xl font-semibold tracking-[-0.025em]">
              {format(currentMonth, 'MMMM yyyy')}
            </h1>
            <ToolbarActions>
              <CalendarAccountMenu
                accounts={accounts}
                activeAccountId={statusQuery.data?.activeAccountId ?? null}
                selectedAccountId={calendarScopeAccountId}
                disabled={connectLoading}
                onAddAccount={() => void handleConnect()}
                onChange={(accountId) => void handleAccountSwitch(accountId)}
                onDisconnect={(accountId) => void handleDisconnect(accountId)}
              />
              <ToolbarControlGroup
                aria-label="Go to today"
                className="rounded-pill"
              >
                <ToolbarButton
                  material="ultra-thin"
                  type="button"
                  onClick={goToToday}
                  className="cursor-pointer"
                >
                  Today
                </ToolbarButton>
              </ToolbarControlGroup>
              <CalendarViewSelect
                value={calendarView}
                onValueChange={handleViewChange}
              />
              <ToolbarControlGroup
                aria-label="Calendar navigation"
                className="rounded-pill"
              >
                <ToolbarIconButton
                  className="cursor-pointer"
                  label={`Previous ${calendarView}`}
                  onClick={prevPeriod}
                >
                  <ChevronLeft />
                </ToolbarIconButton>
                <ToolbarIconButton
                  className="cursor-pointer"
                  label={`Next ${calendarView}`}
                  onClick={nextPeriod}
                >
                  <ChevronRight />
                </ToolbarIconButton>
              </ToolbarControlGroup>
            </ToolbarActions>
          </Toolbar>

          {/* Error banner — honest failure state with retry. */}
          {showErrorBanner && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-3 border-b px-4 py-2.5 text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span className="flex-1">
                Couldn’t load your calendar. Check your connection and try
                again.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorDismissed(true)
                  void Promise.all([statusQuery.refetch(), refetch()])
                }}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 h-7 gap-1.5 px-2.5 text-xs"
              >
                <RotateCw className="size-3" />
                Retry
              </Button>
              <IconButton
                label="Dismiss calendar error"
                tooltip
                size="xs"
                variant="ghost"
                onClick={() => setErrorDismissed(true)}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          )}

          <main className="calendar-canvas flex flex-1 flex-col overflow-hidden">
            {calendarView === 'month' ? (
              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  {/* Weekday header */}
                  <div className="calendar-weekday-header border-border grid grid-cols-7 border-b">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="text-muted-foreground flex h-8 items-center justify-center text-xs font-medium"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid */}
                  <div className="relative flex-1 overflow-auto">
                    <div
                      tabIndex={0}
                      role="grid"
                      aria-label="Month calendar — use arrow keys to change month"
                      key={animKey}
                      data-dir={slideDir ?? undefined}
                      onKeyDown={handleGridKeyDown}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onAnimationEnd={() => setSlideDir(null)}
                      className="cal-grid-anim grid min-h-full select-none auto-rows-fr grid-cols-7 pb-[var(--chat-safe-padding)] outline-none"
                    >
                      {calendarDays.map((day) => {
                        const dayEvents = dayEventsFor(day)
                        const isSelected = monthInspectorDate
                          ? isSameDay(day, monthInspectorDate)
                          : false
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const today = isToday(day)

                        return (
                          <button
                            type="button"
                            key={day.toISOString()}
                            role="gridcell"
                            aria-selected={isSelected}
                            onClick={() => {
                              navigateToDate(day)
                              setMonthInspectorDate(isSelected ? null : day)
                            }}
                            className={cn(
                              'calendar-month-cell hover:bg-muted/25 group relative flex min-h-[92px] cursor-pointer flex-col border-b border-r p-1.5 text-left transition-colors focus:outline-none',
                              !isCurrentMonth &&
                                'calendar-month-cell-outside text-muted-foreground/40',
                              isSelected && 'bg-muted/45',
                            )}
                          >
                            <span
                              className={cn(
                                'inline-flex size-6 items-center justify-center self-end rounded-md text-xs font-medium tabular-nums transition-colors',
                                today
                                  ? 'bg-destructive text-destructive-foreground'
                                  : isSelected
                                    ? 'bg-muted text-foreground font-semibold'
                                    : isCurrentMonth
                                      ? 'text-foreground'
                                      : 'text-muted-foreground/30',
                              )}
                            >
                              {format(day, 'd')}
                            </span>

                            <div className="mt-0.5 w-full flex-1 space-y-[3px] overflow-hidden">
                              {calendarDataPending ? (
                                <CalendarCellLoadingSkeleton day={day} />
                              ) : (
                                <>
                                  {dayEvents.slice(0, 4).map((event) => {
                                    const color = eventColor(event)

                                    // All-day: subtle full-width colored bar (not a loud fill).
                                    if (event.isAllDay) {
                                      return (
                                        <EventPopover
                                          key={calendarEventKey(event)}
                                          event={event}
                                          formatTimeRange={formatTimeRange}
                                          openExternalLink={openExternalLink}
                                        >
                                          <div
                                            className="calendar-event-chip flex cursor-pointer items-center gap-1 truncate font-medium"
                                            style={{
                                              backgroundColor: color
                                                ? `${color}22`
                                                : undefined,
                                              color: color ?? undefined,
                                              borderLeft: `3px solid ${color ?? 'var(--primary)'}`,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {event.conferenceUrl && (
                                              <Video className="size-2.5 shrink-0" />
                                            )}
                                            <span className="truncate">
                                              {event.title}
                                            </span>
                                          </div>
                                        </EventPopover>
                                      )
                                    }

                                    return (
                                      <EventPopover
                                        key={calendarEventKey(event)}
                                        event={event}
                                        formatTimeRange={formatTimeRange}
                                        openExternalLink={openExternalLink}
                                      >
                                        <div
                                          className={cn(
                                            'calendar-event-chip flex cursor-pointer items-center gap-1.5 truncate transition-colors',
                                            event.isPastEvent && 'opacity-55',
                                            !color && 'hover:bg-primary/10',
                                          )}
                                          style={{
                                            backgroundColor: color
                                              ? `${color}1f`
                                              : undefined,
                                            color: color ?? undefined,
                                            borderLeft: color
                                              ? `2px solid ${color}`
                                              : undefined,
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {!color && (
                                            <div
                                              className={cn(
                                                'size-1.5 shrink-0 rounded-full',
                                                event.isPastEvent
                                                  ? 'bg-muted-foreground'
                                                  : 'bg-primary',
                                              )}
                                            />
                                          )}
                                          {event.conferenceUrl && (
                                            <Video className="size-2.5 shrink-0" />
                                          )}
                                          <span
                                            className={cn(
                                              'truncate',
                                              event.status === 'cancelled' &&
                                                'line-through',
                                            )}
                                          >
                                            {event.title}
                                          </span>
                                        </div>
                                      </EventPopover>
                                    )
                                  })}
                                  {dayEvents.length > 4 && (
                                    <div className="text-muted-foreground/70 pl-1 text-[11px] font-medium">
                                      +{dayEvents.length - 4} more
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {monthInspectorDate ? (
                  <ResizableRightPanel
                    width={monthInspectorWidth}
                    minWidth={MIN_MONTH_INSPECTOR_WIDTH}
                    maxWidth={MAX_MONTH_INSPECTOR_WIDTH}
                    onWidthChange={setMonthInspectorWidth}
                    onResizeEnd={saveMonthInspectorWidth}
                    resizeLabel="Resize selected day schedule"
                    className="calendar-month-inspector border-border min-h-0 border-l"
                  >
                    <SelectedDayAgenda
                      selectedDate={monthInspectorDate}
                      allDayEvents={monthInspectorAllDayEvents}
                      timedEvents={monthInspectorTimedEvents}
                      loading={calendarDataPending}
                      formatTimeRange={formatTimeRange}
                      openExternalLink={openExternalLink}
                      onClose={() => setMonthInspectorDate(null)}
                    />
                  </ResizableRightPanel>
                ) : null}
              </div>
            ) : (
              <CalendarTimeGrid
                mode={calendarView}
                anchorDate={currentMonth}
                events={displayedEvents}
                eventKey={calendarEventKey}
                loading={calendarDataPending}
                onSelectDate={navigateToDate}
                renderEvent={(event, context) => (
                  <CalendarTimeGridEvent
                    event={event}
                    context={context}
                    formatTimeRange={formatTimeRange}
                    openExternalLink={openExternalLink}
                  />
                )}
              />
            )}
          </main>
        </div>
      </AppFrameContent>
    </AppShell>
  )
}

function MiniMonthCalendar({
  month,
  selectedDate,
  days,
  onPrevious,
  onNext,
  onSelect,
}: {
  month: Date
  selectedDate: Date
  days: Date[]
  onPrevious: () => void
  onNext: () => void
  onSelect: (day: Date) => void
}) {
  return (
    <section aria-label="Mini month calendar">
      <div className="flex h-8 items-center justify-between px-1">
        <h2 className="text-foreground text-sm font-semibold tracking-[-0.01em]">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="size-7 cursor-pointer rounded-md"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="size-7 cursor-pointer rounded-md"
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="text-muted-foreground flex h-6 items-center justify-center text-[10px] font-medium"
          >
            {weekday.slice(0, 1)}
          </span>
        ))}
        {days.map((day) => {
          const current = isSameMonth(day, month)
          const selected = isSameDay(day, selectedDate)
          const today = isToday(day)
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-current={today ? 'date' : undefined}
              className={cn(
                'mx-auto flex size-7 cursor-pointer items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors',
                today
                  ? 'bg-destructive text-destructive-foreground'
                  : selected
                    ? 'bg-muted text-foreground'
                    : current
                      ? 'text-foreground hover:bg-muted/60'
                      : 'text-muted-foreground/40 hover:bg-muted/40',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function CalendarViewSelect({
  value,
  onValueChange,
  className,
}: {
  value: CalendarView
  onValueChange: (view: CalendarView) => void
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as CalendarView)}
    >
      <SelectTrigger
        size="sm"
        aria-label="Calendar view"
        className={cn(
          'w-auto min-w-[6.5rem] cursor-pointer rounded-md',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="day" className="cursor-pointer">
          Day
        </SelectItem>
        <SelectItem value="week" className="cursor-pointer">
          Week
        </SelectItem>
        <SelectItem value="month" className="cursor-pointer">
          Month
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

function CalendarScopeButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'hover:bg-muted/50 flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-xs transition-colors',
        selected ? 'text-foreground font-medium' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'border-primary/60 flex size-3.5 items-center justify-center rounded-[4px] border',
          selected ? 'bg-primary text-primary-foreground' : 'bg-background',
        )}
        aria-hidden
      >
        {selected ? <Check className="size-2.5" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

function CalendarAccountMenu({
  accounts,
  activeAccountId,
  selectedAccountId,
  disabled,
  onAddAccount,
  onChange,
  onDisconnect,
  className,
  iconOnly = false,
}: {
  accounts: CalendarAccount[]
  activeAccountId: string | null
  selectedAccountId: string | null
  disabled: boolean
  onAddAccount: () => void
  onChange: (accountId: string | null) => void
  onDisconnect: (accountId: string) => void
  className?: string
  iconOnly?: boolean
}) {
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  )
  const disconnectAccount =
    selectedAccount ??
    accounts.find((account) => account.id === activeAccountId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          type="button"
          disabled={disabled}
          material="ultra-thin"
          className={cn(
            'max-w-[18rem] cursor-pointer rounded-md font-medium',
            iconOnly && 'size-7 justify-center p-0',
            className,
          )}
          aria-label="Choose Google Calendar account"
        >
          {iconOnly ? (
            <MoreHorizontal className="text-muted-foreground size-4" />
          ) : (
            <>
              <span className="truncate">
                {selectedAccountId === null && accounts.length > 1
                  ? 'All calendars'
                  : (selectedAccount?.emailAddress ?? 'Choose account')}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            </>
          )}
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-sm! w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs! font-normal">
          Google Calendar accounts
        </DropdownMenuLabel>
        {accounts.length > 1 ? (
          <DropdownMenuItem
            className="text-sm! cursor-pointer"
            onClick={() => onChange(null)}
          >
            <span className="truncate">All calendars</span>
            {selectedAccountId === null ? (
              <Check className="text-primary ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
        ) : null}
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            className="text-sm! cursor-pointer"
            onClick={() => {
              onChange(account.id)
              if (account.authenticated === false) onAddAccount()
            }}
          >
            <span className="truncate">{account.emailAddress}</span>
            {account.id === selectedAccountId ? (
              <Check className="text-primary ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-sm! cursor-pointer"
          onClick={onAddAccount}
        >
          <UserPlus className="size-3.5" />
          Add Google Calendar account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive text-sm! cursor-pointer"
          disabled={!disconnectAccount}
          onClick={() => {
            if (disconnectAccount) onDisconnect(disconnectAccount.id)
          }}
        >
          <LogOut className="size-3.5" />
          <span className="truncate">
            {disconnectAccount
              ? `Disconnect ${disconnectAccount.emailAddress}`
              : 'Disconnect account'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileCalendarAccountSheet({
  open,
  onOpenChange,
  accounts,
  activeAccountId,
  selectedAccountId,
  disabled,
  onAddAccount,
  onChange,
  onDisconnect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: CalendarAccount[]
  activeAccountId: string | null
  selectedAccountId: string | null
  disabled: boolean
  onAddAccount: () => void
  onChange: (accountId: string | null) => void
  onDisconnect: (accountId: string) => void
}) {
  const disconnectAccount =
    accounts.find((account) => account.id === selectedAccountId) ??
    accounts.find((account) => account.id === activeAccountId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        mobileSide="left"
        size="sm"
        className="calendar-mobile-calendars-sheet gap-0 p-0"
      >
        <SheetHeader className="border-border border-b px-5 pb-4 pt-5">
          <SheetTitle>Calendars</SheetTitle>
          <SheetDescription>
            Choose which connected Google Calendar to show.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-3 py-3">
          <div className="space-y-1">
            {accounts.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className={cn(
                  'hover:bg-muted/60 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors',
                  selectedAccountId === null && 'bg-muted/70 font-semibold',
                )}
              >
                <span className="bg-primary/12 text-primary flex size-8 items-center justify-center rounded-lg">
                  <CalendarDays className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">All calendars</span>
                {selectedAccountId === null ? (
                  <Check className="text-primary size-4 shrink-0" />
                ) : null}
              </button>
            ) : null}
            {accounts.map((account) => {
              const selected = account.id === selectedAccountId
              return (
                <button
                  type="button"
                  key={account.id}
                  onClick={() => {
                    onChange(account.id)
                    if (account.authenticated === false) onAddAccount()
                  }}
                  className={cn(
                    'hover:bg-muted/60 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors',
                    selected && 'bg-muted/70 font-semibold',
                    account.authenticated === false && 'text-muted-foreground',
                  )}
                >
                  <span className="border-primary/50 bg-primary/10 flex size-8 items-center justify-center rounded-lg border">
                    <CalendarIcon className="text-primary size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {account.emailAddress}
                  </span>
                  {selected ? (
                    <Check className="text-primary size-4 shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="border-border mt-3 space-y-1 border-t pt-3">
            <button
              type="button"
              onClick={onAddAccount}
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors"
            >
              <UserPlus className="size-4" />
              Add Google Calendar account
            </button>
            {disconnectAccount ? (
              <button
                type="button"
                onClick={() => onDisconnect(disconnectAccount.id)}
                className="text-destructive hover:bg-destructive/10 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors"
              >
                <LogOut className="size-4" />
                <span className="truncate">
                  Disconnect {disconnectAccount.emailAddress}
                </span>
              </button>
            ) : null}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function SelectedDayAgenda({
  selectedDate,
  allDayEvents,
  timedEvents,
  loading,
  formatTimeRange,
  openExternalLink,
  onClose,
}: {
  selectedDate: Date
  allDayEvents: CalendarEvent[]
  timedEvents: CalendarEvent[]
  loading: boolean
  formatTimeRange: (start: string, end: string) => string
  openExternalLink: (url: string) => void
  onClose?: () => void
}) {
  const isMobile = useMoldablePlatform() === 'mobileWeb'

  return (
    <section className="calendar-selected-day-agenda flex size-full min-h-0 flex-col">
      <div className="calendar-selected-day border-border flex items-center justify-between border-b px-3 py-2.5">
        <div className="calendar-selected-day-heading min-w-0">
          <p className="text-foreground truncate text-sm font-semibold">
            {isMobile
              ? isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEEE')
              : isToday(selectedDate)
                ? "Today's schedule"
                : `${format(selectedDate, 'EEEE')}'s schedule`}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {format(selectedDate, isMobile ? 'MMMM d' : 'MMMM d, yyyy')}
          </p>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-1',
            isMobile && 'hidden',
          )}
        >
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg text-sm font-semibold tabular-nums',
              isToday(selectedDate)
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-muted text-foreground',
            )}
          >
            {format(selectedDate, 'd')}
          </span>
          {onClose ? (
            <IconButton
              label="Close selected day schedule"
              tooltip
              size="xs"
              variant="ghost"
              onClick={onClose}
            >
              <X className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-3 pb-[calc(var(--chat-safe-padding,0px)+0.75rem)] pt-3">
          {loading ? <AgendaLoadingSkeleton /> : null}

          {!loading && allDayEvents.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                All day
              </p>
              {allDayEvents.map((event) => {
                const color = eventColor(event)
                return (
                  <EventPopover
                    key={calendarEventKey(event)}
                    event={event}
                    formatTimeRange={formatTimeRange}
                    openExternalLink={openExternalLink}
                  >
                    <button
                      type="button"
                      className="hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                      style={{
                        borderLeft: `3px solid ${color ?? 'var(--primary)'}`,
                      }}
                    >
                      <span className="text-foreground flex-1 truncate text-xs font-semibold">
                        {event.title}
                      </span>
                      {event.conferenceUrl ? (
                        <Video className="text-muted-foreground size-3 shrink-0" />
                      ) : null}
                    </button>
                  </EventPopover>
                )
              })}
            </div>
          ) : null}

          {!loading && timedEvents.length === 0 && allDayEvents.length === 0 ? (
            <EmptyAgenda openExternalLink={openExternalLink} />
          ) : null}
          {!loading && timedEvents.length > 0 ? (
            <div className="relative space-y-2">
              {timedEvents.map((event) => {
                const declined = event.selfResponseStatus === 'declined'
                const cancelled = event.status === 'cancelled'
                const dimmed = event.isPastEvent || declined
                const color = eventColor(event)
                const locationLabel = event.location
                  ? compactLocationLabel(event.location)
                  : null
                const guestCount = event.attendees?.length ?? 0
                return (
                  <EventPopover
                    key={calendarEventKey(event)}
                    event={event}
                    formatTimeRange={formatTimeRange}
                    openExternalLink={openExternalLink}
                  >
                    <button
                      type="button"
                      className={cn(
                        'hover:bg-muted/50 group flex w-full cursor-pointer gap-2 rounded-md px-1 py-0.5 text-left transition-colors',
                        dimmed && 'opacity-60',
                      )}
                    >
                      <div className="flex w-9 shrink-0 flex-col pt-px">
                        <span
                          className={cn(
                            'text-[11px] font-semibold tabular-nums leading-3',
                            event.isPastEvent
                              ? 'text-muted-foreground'
                              : 'text-primary',
                          )}
                        >
                          {format(parseISO(event.start), 'h:mm')}
                        </span>
                        <span className="text-muted-foreground text-[9px] uppercase tabular-nums leading-3">
                          {format(parseISO(event.start), 'aa')}
                        </span>
                      </div>
                      <div
                        className="mt-1 w-0.5 shrink-0 self-stretch rounded-full"
                        style={{
                          backgroundColor: color ?? 'var(--primary)',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-xs font-semibold leading-4',
                              (cancelled || declined) &&
                                'decoration-muted-foreground/40 line-through',
                            )}
                          >
                            {event.title}
                          </span>
                          {event.conferenceUrl ? (
                            <Video className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                          ) : null}
                        </div>
                        {locationLabel || guestCount > 1 ? (
                          <div className="text-muted-foreground flex min-w-0 items-center gap-1 text-[10px] leading-3">
                            {locationLabel ? (
                              <>
                                <MapPin className="size-2.5 shrink-0" />
                                <span
                                  className="truncate"
                                  title={event.location}
                                >
                                  {locationLabel}
                                </span>
                              </>
                            ) : null}
                            {locationLabel && guestCount > 1 ? (
                              <span aria-hidden>·</span>
                            ) : null}
                            {guestCount > 1 ? (
                              <span className="flex shrink-0 items-center gap-0.5">
                                <Users className="size-2.5" />
                                {guestCount}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </EventPopover>
                )
              })}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  )
}

function CalendarTimeGridEvent({
  event,
  context,
  formatTimeRange,
  openExternalLink,
}: {
  event: CalendarEvent
  context: TimeGridRenderContext
  formatTimeRange: (start: string, end: string) => string
  openExternalLink: (url: string) => void
}) {
  const color = eventColor(event)

  return (
    <EventPopover
      event={event}
      formatTimeRange={formatTimeRange}
      openExternalLink={openExternalLink}
    >
      <button
        type="button"
        className={cn(
          'calendar-time-event flex size-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-md px-2 py-1 text-left transition-[filter,opacity] hover:brightness-105',
          context.allDay && 'h-[26px] flex-row items-center py-0.5',
          event.isPastEvent && 'opacity-55',
          event.status === 'cancelled' && 'line-through',
        )}
        style={{
          backgroundColor: color
            ? `${color}22`
            : 'color-mix(in oklch, var(--primary) 9%, var(--background))',
          borderLeft: `3px solid ${color ?? 'var(--primary)'}`,
          color: color ?? 'var(--foreground)',
        }}
      >
        <span className="w-full truncate text-[11px] font-semibold leading-4">
          {event.title}
        </span>
        {!context.allDay && !context.compact ? (
          <span className="w-full truncate text-[10px] leading-3 opacity-70">
            {formatTimeRange(event.start, event.end)}
            {event.location
              ? ` · ${compactLocationLabel(event.location)}`
              : null}
          </span>
        ) : null}
      </button>
    </EventPopover>
  )
}

// ── Event popover ──────────────────────────────────────────────────────────

function EventPopover({
  event,
  formatTimeRange,
  openExternalLink,
  children,
}: {
  event: CalendarEvent
  formatTimeRange: (start: string, end: string) => string
  openExternalLink: (url: string) => void
  children: React.ReactNode
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const platform = useMoldablePlatform()
  const queryClient = useQueryClient()
  const [optimisticRsvp, setOptimisticRsvp] = useState<ResponseStatus | null>(
    null,
  )

  const rsvp = useMutation({
    mutationFn: async (responseStatus: ResponseStatus) => {
      const res = await fetchWithWorkspace('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: event.accountId,
          eventId: event.id,
          responseStatus,
        }),
      })
      if (!res.ok) throw new Error('Failed to update RSVP')
      const data = await res.json()
      if (!data.ok)
        throw new Error(data.error?.message ?? 'Failed to update RSVP')
      return responseStatus
    },
    onMutate: (responseStatus) => setOptimisticRsvp(responseStatus),
    onError: () => setOptimisticRsvp(null),
    onSettled: () => {
      setOptimisticRsvp(null)
      queryClient.invalidateQueries({ queryKey: ['events', workspaceId] })
    },
  })

  const currentRsvp = (optimisticRsvp ??
    event.selfResponseStatus ??
    null) as ResponseStatus | null

  const attendees = event.attendees ?? []
  const canRsvp = attendees.some((a) => a.self)
  const color = eventColor(event)
  const recurrenceLabel = calendarRecurrenceLabel(event)

  const details = (
    <div className="space-y-3">
      <div>
        <div className="flex items-start gap-2">
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color ?? 'var(--primary)' }}
          />
          <h4 className="text-foreground flex-1 text-sm font-semibold leading-tight">
            {event.title}
          </h4>
        </div>
        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span>{format(parseEventDay(event), 'EEEE, MMMM d')}</span>
        </div>
        <div className="text-foreground mt-1 flex items-center gap-1.5 text-xs font-medium">
          <Clock className="size-3.5 shrink-0" />
          <span>
            {event.isAllDay
              ? 'All day'
              : formatTimeRange(event.start, event.end)}
          </span>
        </div>
        {recurrenceLabel ? (
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Repeat2 className="size-3.5 shrink-0" />
            <span>{recurrenceLabel}</span>
          </div>
        ) : null}
        {event.accountEmailAddress ? (
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Users className="size-3.5 shrink-0" />
            <span className="truncate">{event.accountEmailAddress}</span>
          </div>
        ) : null}
      </div>

      {event.conferenceUrl ? (
        <Button
          size="sm"
          className="h-9 w-full cursor-pointer gap-2"
          onClick={() => openExternalLink(event.conferenceUrl!)}
        >
          <Video className="size-4" />
          Join {event.conferenceProvider ?? 'video call'}
        </Button>
      ) : null}

      {canRsvp ? (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            Your response
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <RsvpButton
              label="Yes"
              icon={<Check className="size-3.5" />}
              active={currentRsvp === 'accepted'}
              activeClass="border-success/40 bg-success/10 text-success"
              disabled={rsvp.isPending}
              onClick={() => rsvp.mutate('accepted')}
            />
            <RsvpButton
              label="Maybe"
              icon={<HelpCircle className="size-3.5" />}
              active={currentRsvp === 'tentative'}
              activeClass="border-warning/40 bg-warning/10 text-warning-foreground"
              disabled={rsvp.isPending}
              onClick={() => rsvp.mutate('tentative')}
            />
            <RsvpButton
              label="No"
              icon={<X className="size-3.5" />}
              active={currentRsvp === 'declined'}
              activeClass="border-destructive/60 bg-destructive/10 text-destructive"
              disabled={rsvp.isPending}
              onClick={() => rsvp.mutate('declined')}
            />
          </div>
        </div>
      ) : null}

      <InviteeEditor event={event} />

      {event.location || event.link ? (
        <div className="border-border/60 space-y-1.5 border-t pt-3">
          {event.location ? (
            <div className="text-muted-foreground flex items-start gap-2 text-xs">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          ) : null}
          {event.link ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-primary/5 -ml-2 h-8 w-full cursor-pointer justify-start gap-2 px-2 text-xs"
              onClick={() => openExternalLink(event.link!)}
            >
              <LinkIcon className="size-3.5" />
              View in Google Calendar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (platform === 'mobileWeb') {
    return (
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          mobileSide="bottom"
          className="calendar-event-sheet gap-0 p-0"
        >
          <SheetHeader className="border-border border-b px-5 pb-3 pt-5 text-left">
            <SheetTitle>Event</SheetTitle>
            <SheetDescription className="sr-only">
              Details and actions for {event.title}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-5 pb-[calc(var(--moldable-safe-bottom,0px)+1.25rem)] pt-4">
            {details}
          </SheetBody>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="calendar-event-popover w-[360px] max-w-[calc(100vw-24px)] overflow-hidden p-0"
        align="start"
      >
        <div className="border-border/60 flex h-10 items-center justify-between border-b px-3">
          <span className="text-foreground text-xs font-semibold">Event</span>
          {event.link ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => openExternalLink(event.link!)}
              className="text-muted-foreground hover:text-foreground size-7 cursor-pointer rounded-md"
              aria-label="Open event in Google Calendar"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-[26rem]">
          <div className="p-4">{details}</div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function RsvpButton({
  label,
  icon,
  active,
  activeClass,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  activeClass: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 cursor-pointer gap-1 text-xs',
        active ? activeClass : 'text-muted-foreground hover:bg-muted/50',
      )}
    >
      {icon}
      {label}
    </Button>
  )
}

// ── Empty + loading states ───────────────────────────────────────────────────

function AgendaLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading calendar events"
      className="space-y-3"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-2" aria-hidden="true">
          <div className="flex w-9 shrink-0 flex-col gap-1 pt-0.5">
            <Skeleton className="h-2.5 w-8 rounded-sm" />
            <Skeleton className="h-2 w-4 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-0.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3 w-4/5 rounded-sm" />
            {item === 0 ? (
              <Skeleton className="h-2.5 w-3/5 rounded-sm" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarCellLoadingSkeleton({ day }: { day: Date }) {
  const variant = (day.getDate() + day.getMonth()) % 5
  if (variant === 0 || variant === 3) return null

  return (
    <div className="space-y-[3px]" aria-hidden="true">
      <Skeleton
        className={cn(
          'h-[15px] rounded-[4px]',
          variant === 1 ? 'w-3/4' : 'w-1/2',
        )}
      />
      {variant === 2 ? (
        <Skeleton className="h-[15px] w-2/3 rounded-[4px]" />
      ) : null}
    </div>
  )
}

function EmptyAgenda({
  openExternalLink,
}: {
  openExternalLink: (url: string) => void
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="bg-muted/60 mb-3 rounded-full p-3">
        <CalendarDays className="text-muted-foreground size-6" />
      </div>
      <p className="text-foreground text-sm font-medium">
        Nothing on the calendar
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Enjoy the open day.
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          openExternalLink('https://calendar.google.com/calendar/r/eventedit')
        }
        className="text-primary hover:bg-primary/5 mt-3 h-7 gap-1.5 px-2 text-xs"
      >
        <ExternalLink className="size-3.5" />
        Add event
      </Button>
    </div>
  )
}

function CalendarLoadingScreen() {
  return (
    <AppShell title="Calendar" nativeMaterial={{ background: true }}>
      <AppFrameContent
        scrollable={false}
        chatSafe={false}
        className="calendar-frame flex flex-row p-0"
      >
        <aside className="calendar-agenda border-border flex min-h-0 flex-col border-r">
          <div className="calendar-sidebar-desktop border-border space-y-5 border-b px-3 pb-4 pt-[calc(var(--window-titlebar-height,0px)+0.75rem)]">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <div className="flex gap-2">
                <Skeleton className="size-6 rounded-md" />
                <Skeleton className="size-6 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-x-3 gap-y-3 px-1">
              {Array.from({ length: 35 }, (_, index) => (
                <Skeleton key={index} className="mx-auto size-3 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-7 w-full rounded-md" />
            <div className="space-y-2 px-1">
              <Skeleton className="h-3 w-16 rounded-sm" />
              <Skeleton className="h-5 w-4/5 rounded-sm" />
            </div>
          </div>

          <div className="calendar-mobile-agenda min-h-0 flex-1 flex-col">
            <div className="calendar-selected-day border-border flex items-center justify-between border-b px-4 py-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="px-3 pt-3">
              <AgendaLoadingSkeleton />
            </div>
          </div>
        </aside>

        <div className="calendar-grid-column flex min-w-0 flex-1 flex-col overflow-hidden">
          <Toolbar
            position="top"
            variant="plain"
            material="none"
            inset="none"
            className="calendar-main-header border-border gap-2 border-b"
            style={{
              minHeight:
                'max(var(--density-toolbar-height, 2rem), var(--window-titlebar-height, 0px))',
            }}
          >
            <Skeleton className="h-6 w-36 rounded-sm" />
            <ToolbarActions>
              <Skeleton className="h-7 w-36 rounded-full" />
            </ToolbarActions>
          </Toolbar>
          <main className="calendar-canvas flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="calendar-weekday-header border-border grid grid-cols-7 border-b">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-muted-foreground flex h-8 items-center justify-center text-xs font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
                {Array.from({ length: 42 }, (_, index) => (
                  <div
                    key={index}
                    className="calendar-month-cell min-h-[92px] border-b border-r p-2"
                  >
                    <Skeleton className="ml-auto size-5 rounded-md" />
                    {index % 4 === 1 ? (
                      <Skeleton className="mt-2 h-[15px] w-2/3 rounded-[4px]" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </AppFrameContent>
    </AppShell>
  )
}
