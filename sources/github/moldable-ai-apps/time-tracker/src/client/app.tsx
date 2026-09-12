'use client'

import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppFrameContent,
  AppHeader,
  AppShell,
  Button,
  ResponsiveLayout,
  ScrollArea,
  SegmentedControl,
  SegmentedControlItem,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarGroup,
  useWorkspace,
} from '@moldable-ai/ui'
import { ExportDialog } from '@/components/export-dialog'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { ProjectManager } from '@/components/project-manager'
import { TimeList } from '@/components/time-list'
import { Timer } from '@/components/timer'
import { WeekCalendar } from '@/components/week-calendar'
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'

type ViewMode = 'list' | 'calendar'

const APP_ID = 'time-tracker'

type UiIntent = {
  id: string
  view: 'list' | 'calendar' | 'projects'
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

type AppApiChangedMessage = {
  type?: unknown
  workspaceId?: unknown
  targetAppId?: unknown
  method?: unknown
}

// Which query families an RPC method touches. Unknown methods invalidate
// everything workspace-scoped so remote writes are never missed.
function queryKeysForMethod(method: string): string[] {
  if (method.includes('.projects.')) return ['projects']
  if (method.includes('.entries.')) return ['entries']
  // The signature start may auto-create a project and close out a running
  // entry, so it touches all three families.
  if (method === 'time-tracker.timer.start') {
    return ['timer', 'entries', 'projects']
  }
  // Stopping a timer creates an entry; keep entries fresh for all timer ops.
  if (method.includes('.timer.')) return ['timer', 'entries']
  return ['projects', 'entries', 'timer']
}

export default function HomePage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [currentWeek, setCurrentWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  )
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)

  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })
  const startDate = format(currentWeek, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  // For filtered list view when a date is selected in calendar
  const listDates = useMemo(() => {
    if (viewMode === 'calendar' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      return { startDate: dateStr, endDate: dateStr }
    }
    return { startDate, endDate }
  }, [viewMode, selectedDate, startDate, endDate])

  const goToToday = () => {
    const today = new Date()
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }))
    setSelectedDate(today)
  }

  const goToPrevWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1))
  }

  const openProjectManager = useCallback(() => {
    if (showProjectManager) return
    setShowProjectManager(true)
  }, [showProjectManager])

  const closeProjectManager = useCallback(() => {
    setShowProjectManager(false)
  }, [])

  const selectViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode === viewMode) return
      setViewMode(mode)
    },
    [viewMode],
  )

  // --- Drive contract: apply host navigation intents and live updates ---

  const applyUiIntent = useCallback(
    (intent: UiIntent) => {
      const rawDate =
        typeof intent.params?.date === 'string'
          ? intent.params.date
          : intent.entityId
      if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const date = new Date(`${rawDate}T00:00:00`)
        if (!Number.isNaN(date.getTime())) {
          setCurrentWeek(startOfWeek(date, { weekStartsOn: 0 }))
          setSelectedDate(date)
        }
      }

      if (intent.view === 'projects') {
        openProjectManager()
        return
      }

      if (showProjectManager) closeProjectManager()
      selectViewMode(intent.view)
    },
    [
      openProjectManager,
      closeProjectManager,
      showProjectManager,
      selectViewMode,
    ],
  )

  // Keep a ref so intent consumption doesn't re-subscribe listeners whenever
  // view state (and therefore applyUiIntent) changes.
  const applyUiIntentRef = useRef(applyUiIntent)
  useEffect(() => {
    applyUiIntentRef.current = applyUiIntent
  }, [applyUiIntent])

  const seenIntentIdsRef = useRef(new Set<string>())

  const consumeUiIntent = useCallback(async () => {
    try {
      const res = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!res.ok) return
      const intent = (await res.json()) as UiIntent | null
      if (!intent || typeof intent.id !== 'string') return
      if (seenIntentIdsRef.current.has(intent.id)) return
      seenIntentIdsRef.current.add(intent.id)
      applyUiIntentRef.current(intent)
      await fetchWithWorkspace(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
        { method: 'DELETE' },
      )
    } catch {
      // Intent polling is best-effort; ignore transient fetch failures.
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    void consumeUiIntent()
  }, [consumeUiIntent, workspaceId])

  // Chat/host mutations post `moldable:app-api-changed`; invalidate the
  // queries the method touched and pick up any pending navigation intent.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as AppApiChangedMessage | null
      if (!data || data.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== APP_ID) return
      if (
        typeof data.workspaceId === 'string' &&
        data.workspaceId !== workspaceId
      ) {
        return
      }

      const method = typeof data.method === 'string' ? data.method : ''
      for (const key of queryKeysForMethod(method)) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === key && query.queryKey[1] === workspaceId,
        })
      }
      void consumeUiIntent()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, workspaceId, consumeUiIntent])

  return (
    <AppShell nativeMaterial={{ background: true }} title="Time Tracker">
      {/* Unified native titlebar with the primary timer controls. */}
      <AppHeader
        title="Time Tracker"
        desktop={
          <Toolbar
            variant="plain"
            material="none"
            position="top"
            className="time-tracker-primary-toolbar gap-4 px-6"
          >
            <ToolbarGroup className="min-w-0 flex-[0_1_48rem] gap-4">
              <Timer
                onNewProject={() => setShowNewProject(true)}
                onManageProjects={openProjectManager}
              />
            </ToolbarGroup>
            <div className="min-w-8 flex-1" aria-hidden="true" />
            <ToolbarActions>
              <ExportDialog />
            </ToolbarActions>
          </Toolbar>
        }
        mobileControls={
          <div className="time-tracker-mobile-primary-controls flex w-full items-center gap-2">
            <Timer
              compact
              onNewProject={() => setShowNewProject(true)}
              onManageProjects={openProjectManager}
            />
            <ExportDialog compactTrigger />
          </div>
        }
      />

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
      />

      {/* Project Manager Sheet */}
      <Sheet
        open={showProjectManager}
        onOpenChange={(open) => {
          if (open) openProjectManager()
          else closeProjectManager()
        }}
      >
        <SheetContent className="flex flex-col px-6">
          <SheetHeader className="px-0">
            <SheetTitle>Manage Projects</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto pt-6">
            <ProjectManager onNewProject={() => setShowNewProject(true)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <AppFrameContent scrollable={false} chatSafe={false}>
        <div className="flex h-full min-h-0">
          {/* Main area */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* View controls */}
            <ResponsiveLayout
              desktop={
                <Toolbar
                  variant="plain"
                  material="none"
                  className="time-tracker-view-toolbar justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-2">
                    {/* Week navigation */}
                    <ToolbarButton
                      material="ultra-thin"
                      className="cursor-pointer"
                      size="icon-xl"
                      onClick={goToPrevWeek}
                    >
                      <ChevronLeft className="size-4" />
                    </ToolbarButton>
                    <span className="min-w-[180px] text-center text-sm font-medium">
                      {format(currentWeek, 'MMM d')} –{' '}
                      {format(weekEnd, 'MMM d, yyyy')}
                    </span>
                    <ToolbarButton
                      material="ultra-thin"
                      className="cursor-pointer"
                      size="icon-xl"
                      onClick={goToNextWeek}
                    >
                      <ChevronRight className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      material="ultra-thin"
                      className="cursor-pointer"
                      onClick={goToToday}
                    >
                      Today
                    </ToolbarButton>
                  </div>

                  {/* View toggle */}
                  <SegmentedControl
                    aria-label="Time entry view"
                    value={viewMode}
                    onValueChange={(value) => selectViewMode(value as ViewMode)}
                  >
                    <SegmentedControlItem value="list">
                      <List className="size-4" />
                      List
                    </SegmentedControlItem>
                    <SegmentedControlItem value="calendar">
                      <CalendarDays className="size-4" />
                      Week
                    </SegmentedControlItem>
                  </SegmentedControl>
                </Toolbar>
              }
              mobile={
                <div className="time-tracker-view-toolbar flex flex-col gap-3 px-4 py-3">
                  <div className="flex items-center justify-between gap-1">
                    <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-0 text-center text-sm font-medium">
                      {format(currentWeek, 'MMM d')} –{' '}
                      {format(weekEnd, 'MMM d, yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                  </div>
                  <SegmentedControl
                    aria-label="Time entry view"
                    value={viewMode}
                    onValueChange={(value) => selectViewMode(value as ViewMode)}
                  >
                    <SegmentedControlItem value="list">
                      <List className="size-4" />
                      List
                    </SegmentedControlItem>
                    <SegmentedControlItem value="calendar">
                      <CalendarDays className="size-4" />
                      Week
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>
              }
            />

            {/* Content area */}
            <ScrollArea className="min-h-0 flex-1">
              <div className="time-tracker-content p-6 pb-[var(--chat-safe-padding)]">
                {viewMode === 'calendar' && (
                  <div className="mb-6">
                    <WeekCalendar
                      weekStart={currentWeek}
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                    />
                  </div>
                )}

                {viewMode === 'calendar' && selectedDate && (
                  <div className="mb-4">
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Entries for {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                  </div>
                )}

                <TimeList
                  startDate={listDates.startDate}
                  endDate={listDates.endDate}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </AppFrameContent>
    </AppShell>
  )
}
