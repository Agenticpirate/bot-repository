import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AppCommand,
  AppFrameContent,
  AppHeader,
  Button,
  MoldableLoadingScreen,
  Toolbar,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableAppCommands,
  useMoldableCommands,
  useWorkspace,
} from '@moldable-ai/ui'
import { ConnectBanner } from './components/ConnectBanner'
import { ConnectDialog } from './components/ConnectDialog'
import { DashboardTray } from './components/DashboardTray'
import { FirstSyncSetup } from './components/FirstSyncSetup'
import { PostConnectCelebration } from './components/PostConnectCelebration'
import { type Tab, TabBar } from './components/TabBar'
import { Toaster } from './components/Toaster'
import { DEFAULT_DASHBOARD_EMOJI, emojiFor } from './components/dashboardIcon'
import { useSyncStatusModel } from './data-access/accounts'
import { DEMO_DASHBOARD_BY_ID } from './data-access/demo'
import {
  type ResolvedDashboard,
  useDataHealth,
  useDataModeQuery,
  useProvisionDashboards,
  useReorderDashboards,
  useResolvedDashboards,
} from './data-access/hooks'
import {
  useCelebrated,
  useDashboardOrder,
  useOnboarding,
} from './data-access/onboarding'
import { PERSONA_DASHBOARDS } from './personas'
import { AccountsScreen } from './screens/AccountsScreen'
import { AddDashboardView } from './screens/AddDashboardView'
import { DashboardsView } from './screens/DashboardsView'
import { OnboardingCarousel } from './screens/OnboardingCarousel'
import { SettingsScreen } from './screens/SettingsScreen'
import {
  type TransactionViewMode,
  TransactionsScreen,
} from './screens/TransactionsScreen'

const PERSONA_IDS = PERSONA_DASHBOARDS.map((p) => p.id)
const AUTO_SYNC_RECENT_ATTEMPT_MS = 10 * 60 * 1000
const AUTO_SYNC_SESSION_KEY_PREFIX = 'money:auto-sync-attempted:'
const autoSyncAttemptedWorkspaces = new Set<string>()

function MoneyWindowToolbar({ title = 'Money' }: { title?: string }) {
  return (
    <AppHeader
      title={title}
      desktop={
        <Toolbar
          position="top"
          variant="plain"
          material="none"
          className="border-0"
        />
      }
    />
  )
}

type MoneyUiIntent = {
  id: string
  view: 'dashboards' | 'accounts' | 'budget'
  params?: { month?: string }
  createdAt: string
}

type AppApiChangedMessage = {
  type: 'moldable:app-api-changed'
  workspaceId?: string
  callerAppId?: string
  targetAppId?: string
  method?: string
  scopes?: string[]
}

function autoSyncAlreadyAttempted(key: string) {
  if (autoSyncAttemptedWorkspaces.has(key)) return true
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function markAutoSyncAttempted(key: string) {
  autoSyncAttemptedWorkspaces.add(key)
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, 'true')
  } catch {
    // Session storage is just a duplicate guard; in-memory state still works.
  }
}

/**
 * The Money product. First-run "install a dashboard" carousel → the installed
 * dashboards on sample data (badged DEMO, with a prompt to connect a real
 * account) → live data once connected. Top-level sections live in a bottom tab
 * bar; Dashboards is one scroll of all dashboards with reorderable pills.
 */
export function MoneyApp() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const ob = useOnboarding()
  const live = useResolvedDashboards()
  const provision = useProvisionDashboards()
  const dataHealth = useDataHealth()
  const dataModeQuery = useDataModeQuery()

  const accounts = dataHealth.data?.counts.accounts
  const accountsKnown = accounts !== undefined
  const hasAccounts = (accounts ?? 0) > 0

  // `?ftue` previews the whole first-run + sample-data flow on any workspace;
  // `?celebrate` previews the one-time post-connect celebration overlay.
  const { forcedFtue, forceCelebrate, forceSetup } = useMemo(() => {
    if (typeof window === 'undefined')
      return { forcedFtue: false, forceCelebrate: false, forceSetup: false }
    const params = new URLSearchParams(window.location.search)
    return {
      forcedFtue: params.has('ftue'),
      forceCelebrate: params.has('celebrate'),
      forceSetup: params.has('setup'),
    }
  }, [])

  const selectedDataMode = forcedFtue ? 'demo' : dataModeQuery.data?.dataMode
  const dataModeKnown = forcedFtue || dataModeQuery.data !== undefined
  const demoMode =
    selectedDataMode === 'demo' || (accountsKnown && !hasAccounts)

  // One sync/ETL poller for the whole app, shared by the global pill + Accounts.
  const sync = useSyncStatusModel(dataModeKnown && !demoMode && hasAccounts)
  const { order, setOrder } = useDashboardOrder()
  const reorderDashboards = useReorderDashboards()
  const autoSyncStarted = useRef(false)

  const [view, setView] = useState<Tab>('dashboards')
  const [activityViewMode, setActivityViewMode] =
    useState<TransactionViewMode>('list')
  const [continued, setContinued] = useState(false)
  const [reopen, setReopen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [pendingInstall, setPendingInstall] = useState<string[]>(ob.installed)
  // Dashboards "table of contents": which section you're scrolled to (drives the
  // pill label), and whether the jump-to tray above the pill is open.
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(
    null,
  )
  const [dashTrayOpen, setDashTrayOpen] = useState(false)
  const [pendingUiIntent, setPendingUiIntent] = useState<MoneyUiIntent | null>(
    null,
  )
  const seenUiIntentIds = useRef<Set<string>>(new Set())
  const runAllRef = useRef(sync.runAll)

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useEffect(() => {
    runAllRef.current = sync.runAll
  }, [sync.runAll])

  // Existing users with a connected account skip the carousel: auto-install the
  // curated dashboards once so the home is never empty.
  const autoCompleted = useRef(false)
  useEffect(() => {
    if (autoCompleted.current || forcedFtue) return
    if (accountsKnown && hasAccounts && !ob.onboarded) {
      autoCompleted.current = true
      ob.complete(PERSONA_IDS)
      provision.mutate(PERSONA_IDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsKnown, hasAccounts, ob.onboarded, forcedFtue])

  useEffect(() => {
    if (autoSyncStarted.current) return
    if (!dataModeKnown || demoMode || !accountsKnown || !hasAccounts) return
    const autoSyncKey = `${AUTO_SYNC_SESSION_KEY_PREFIX}${workspaceId}`
    if (autoSyncAlreadyAttempted(autoSyncKey)) {
      autoSyncStarted.current = true
      return
    }
    if (
      sync.lastAttemptAt &&
      Date.now() - Date.parse(sync.lastAttemptAt) < AUTO_SYNC_RECENT_ATTEMPT_MS
    ) {
      autoSyncStarted.current = true
      markAutoSyncAttempted(autoSyncKey)
      return
    }
    if (sync.busy) {
      autoSyncStarted.current = true
      markAutoSyncAttempted(autoSyncKey)
      return
    }
    autoSyncStarted.current = true
    markAutoSyncAttempted(autoSyncKey)
    runAllRef.current()
  }, [
    accountsKnown,
    dataModeKnown,
    demoMode,
    hasAccounts,
    sync.busy,
    sync.lastAttemptAt,
    workspaceId,
  ])

  const needsOnboard = accountsKnown && !hasAccounts && !ob.onboarded
  const showCarousel = (!continued && (forcedFtue || needsOnboard)) || reopen

  const installedIds = ob.installed.length ? ob.installed : pendingInstall

  // One-time "your real numbers are in" celebration: fire the first time demo
  // data flips to a real connected account. We watch the demo→live transition
  // (not just `hasAccounts`) so existing/auto-onboarded users don't see it.
  const { celebrated, markCelebrated } = useCelebrated()
  const [celebrating, setCelebrating] = useState(forceCelebrate)
  const wasDemoRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (!accountsKnown) return
    const prev = wasDemoRef.current
    wasDemoRef.current = demoMode
    if (prev === true && demoMode === false && !celebrated) {
      setCelebrating(true)
      markCelebrated()
    }
  }, [accountsKnown, demoMode, celebrated, markCelebrated])

  const dashboards: ResolvedDashboard[] = useMemo(() => {
    const base: ResolvedDashboard[] = demoMode
      ? installedIds
          .map((id) => DEMO_DASHBOARD_BY_ID[id])
          .filter((d): d is ResolvedDashboard => Boolean(d))
      : // Live mode: ALL backend dashboards (so agent-created ones appear).
        [...live.dashboards]
    // Apply the user's drag-to-reorder order (first = default), then personas,
    // then anything else, so new/unordered dashboards still show.
    const userRank = new Map(order.map((id, i) => [id, i]))
    const personaRank = new Map(PERSONA_IDS.map((id, i) => [id, 100 + i]))
    const rank = (id: string) => userRank.get(id) ?? personaRank.get(id) ?? 999
    return base.sort((a, b) => rank(a.id) - rank(b.id))
  }, [demoMode, installedIds, live.dashboards, order])
  const activeDashboard =
    dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0]

  // Reorder: optimistic local order for instant feedback, then persist to the
  // server (live only) so the default syncs across devices.
  const handleReorder = useCallback(
    (ids: string[]) => {
      setOrder(ids)
      if (!demoMode) reorderDashboards.mutate(ids)
    },
    [setOrder, demoMode, reorderDashboards],
  )

  // Adopt the server's saved order on first live load, so a default arranged on
  // another device shows here. Once the user drags, local order takes over and
  // writes back to the server.
  const adoptedOrder = useRef(false)
  useEffect(() => {
    if (adoptedOrder.current || demoMode) return
    if (!live.isLoading && live.dashboards.length > 0 && order.length === 0) {
      adoptedOrder.current = true
      setOrder(live.dashboards.map((d) => d.id))
    }
  }, [demoMode, live.isLoading, live.dashboards, order.length, setOrder])

  // First-sync ETL takeover: when a brand-new connection lands we kick off the
  // initial sync (`complete-link` only marks the item connected — it doesn't
  // import), set `setupActive`, and show "Setting up your money" until cards
  // materialize. Tracked explicitly (not inferred from `sync.busy`) so existing
  // users never see it, even mid-background-sync.
  const liveCardCount = useMemo(
    () => live.dashboards.reduce((n, d) => n + d.cards.length, 0),
    [live.dashboards],
  )
  const [setupActive, setSetupActive] = useState(false)
  const sawSetupBusy = useRef(false)
  useEffect(() => {
    if (!setupActive) {
      sawSetupBusy.current = false
      return
    }
    if (sync.busy) sawSetupBusy.current = true
    // Exit once cards land (success) or the pass finished without them (error/no-op).
    else if (liveCardCount > 0 || sawSetupBusy.current) setSetupActive(false)
  }, [setupActive, sync.busy, liveCardCount])
  const firstSync = forceSetup || setupActive

  const changeTab = (tab: Tab) => {
    setDashTrayOpen(false)
    setView(tab)
  }

  // Smooth-scroll to a dashboard section (the sections render with stable
  // `dash-<id>` DOM ids in DashboardsView) and close the tray.
  const jumpToDashboard = useCallback((id: string) => {
    document
      .getElementById(`dash-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setDashTrayOpen(false)
  }, [])

  const refreshUiIntent = useCallback(async () => {
    try {
      const response = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!response.ok) return
      const intent = (await response.json()) as MoneyUiIntent | null
      if (!intent?.id || seenUiIntentIds.current.has(intent.id)) return
      setPendingUiIntent(intent)
    } catch {
      // Best-effort; retry when the host reports another app API call.
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    void refreshUiIntent()
  }, [refreshUiIntent])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as AppApiChangedMessage | null
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'money') return
      if (data.workspaceId && data.workspaceId !== workspaceId) return

      const touched = [data.method, ...(data.scopes ?? [])].filter(
        (method): method is string => Boolean(method?.startsWith('money.')),
      )
      if (touched.some((method) => !method.startsWith('money.ui.'))) {
        void queryClient.invalidateQueries()
      }
      void refreshUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, refreshUiIntent, workspaceId])

  useEffect(() => {
    if (!pendingUiIntent) return

    if (pendingUiIntent.view === 'accounts') {
      setDashTrayOpen(false)
      setView('accounts')
    } else {
      setDashTrayOpen(false)
      setView('dashboards')
      if (pendingUiIntent.view === 'budget') {
        setActiveDashboardId('cashflow')
        window.requestAnimationFrame(() => jumpToDashboard('cashflow'))
      }
    }

    const intentId = pendingUiIntent.id
    seenUiIntentIds.current.add(intentId)
    setPendingUiIntent(null)
    void fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intentId)}`,
      { method: 'DELETE' },
    )
  }, [fetchWithWorkspace, jumpToDashboard, pendingUiIntent])

  // Reopen the "install a dashboard" carousel (shared by the tray + the
  // in-page "Add a dashboard" button).
  const openAddDashboard = useCallback(() => {
    setDashTrayOpen(false)
    setPendingInstall(ob.installed)
    setContinued(false)
    setReopen(true)
  }, [ob.installed])

  const toggleInstall = useCallback(
    (id: string) => {
      setPendingInstall((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        provision.mutate([id])
        return [...prev, id]
      })
    },
    [provision],
  )

  const finishCarousel = () => {
    ob.complete(pendingInstall)
    provision.mutate(pendingInstall)
    setOrder(pendingInstall)
    setContinued(true)
    setReopen(false)
    setView('dashboards')
  }

  // Compact "Add a dashboard" (reopen): install one persona without leaving the
  // picker, and close back to the dashboards once done.
  const installPersona = (id: string) => {
    ob.install(id)
    setPendingInstall((prev) => (prev.includes(id) ? prev : [...prev, id]))
    provision.mutate([id])
  }

  const closeAddDashboard = () => {
    setContinued(true)
    setReopen(false)
    setView('dashboards')
  }

  // Hand the agent a starter prompt and open the chat; the user fills in the rest.
  const createDashboardWithChat = () => {
    const text = 'Help me create a dashboard that:'
    sendToMoldable({
      type: 'moldable:set-chat-input',
      text,
    })
    closeAddDashboard()
  }

  const connect = () => setConnectOpen(true)

  // A brand-new connection just landed → import its data and show the setup state.
  const handleConnected = () => {
    setSetupActive(true)
    sync.runAll()
  }

  // Publish quick actions to the host command menu (discoverable + agent-friendly).
  const commands = useMemo<AppCommand[]>(
    () => [
      {
        id: 'money.dashboards',
        label: 'Dashboards',
        icon: 'LayoutGrid',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.dashboards' },
      },
      {
        id: 'money.activity',
        label: 'Activity',
        icon: 'Inbox',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.activity' },
      },
      {
        id: 'money.subscriptions',
        label: 'Subscriptions',
        icon: 'Repeat',
        group: 'Money',
        action: {
          type: 'message',
          payload: null,
          command: 'money.subscriptions',
        },
      },
      {
        id: 'money.accounts',
        label: 'Accounts',
        icon: 'Building2',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.accounts' },
      },
      {
        id: 'money.connect',
        label: 'Connect an account',
        icon: 'Landmark',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.connect' },
      },
      {
        id: 'money.settings',
        label: 'Settings',
        icon: 'Settings',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.settings' },
      },
    ],
    [],
  )
  useMoldableAppCommands('money', commands)
  useMoldableCommands({
    'money.dashboards': () => changeTab('dashboards'),
    'money.activity': () => {
      setActivityViewMode('list')
      changeTab('transactions')
    },
    'money.subscriptions': () => {
      setActivityViewMode('subscriptions')
      changeTab('transactions')
    },
    'money.accounts': () => changeTab('accounts'),
    'money.settings': () => changeTab('settings'),
    'money.connect': () => setConnectOpen(true),
  })

  // Wait for the account signal before deciding carousel, demo, or live mode.
  if (
    !forcedFtue &&
    (!accountsKnown || dataModeQuery.isLoading || dataModeQuery.isError)
  ) {
    // A transient failure of the one bootstrap query must not dead-end on a
    // blank screen — give a clear error with a retry instead.
    if (dataHealth.isError || dataModeQuery.isError) {
      return (
        <div className="bg-background flex h-full flex-col">
          <MoneyWindowToolbar />
          <AppFrameContent
            scrollable={false}
            chatSafe={false}
            className="money-static-content bg-background text-foreground flex flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <AlertCircle className="text-muted-foreground size-9" />
            <div>
              <p className="font-medium">Couldn’t load your money</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Something went wrong reaching Money. Make sure the app is
                running, then try again.
              </p>
            </div>
            <Button
              onClick={() => {
                void dataHealth.refetch()
                void dataModeQuery.refetch()
              }}
              disabled={dataHealth.isFetching || dataModeQuery.isFetching}
            >
              {dataHealth.isFetching || dataModeQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Try again
            </Button>
          </AppFrameContent>
        </div>
      )
    }
    return (
      <div className="bg-background flex h-full flex-col">
        <MoneyWindowToolbar />
        <AppFrameContent
          scrollable={false}
          chatSafe={false}
          className="money-static-content bg-background flex"
        >
          <MoldableLoadingScreen label="Loading Money" />
        </AppFrameContent>
      </div>
    )
  }

  if (showCarousel) {
    return (
      <div className="bg-background flex h-full flex-col">
        <MoneyWindowToolbar />
        <AppFrameContent
          scrollable={false}
          chatSafe={false}
          className="money-static-content bg-background text-foreground"
        >
          {reopen ? (
            // Reopening the picker (not first-run): a compact list + "create with
            // chat", never the full paging previews again.
            <AddDashboardView
              installedIds={dashboards.map((d) => d.id)}
              onInstall={installPersona}
              onCreateWithChat={createDashboardWithChat}
              onDone={closeAddDashboard}
            />
          ) : (
            <OnboardingCarousel
              installed={pendingInstall}
              onToggle={toggleInstall}
              onContinue={finishCarousel}
            />
          )}
        </AppFrameContent>
      </div>
    )
  }

  // First-sync takeover: a brand-new connection is importing → show the setup
  // state full-screen until the dashboards materialize.
  if (firstSync) {
    return (
      <div className="bg-background flex h-full flex-col">
        <MoneyWindowToolbar />
        <AppFrameContent
          scrollable={false}
          chatSafe={false}
          className="money-static-content bg-background text-foreground"
        >
          <FirstSyncSetup label={sync.busy ? sync.label : undefined} />
          <Toaster />
        </AppFrameContent>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-full flex-col">
      <MoneyWindowToolbar
        title={
          view === 'dashboards'
            ? 'Money'
            : view === 'transactions'
              ? 'Activity'
              : view === 'accounts'
                ? 'Accounts'
                : 'Settings'
        }
      />
      <AppFrameContent
        scrollable
        chatSafe={false}
        className="bg-background text-foreground"
      >
        {demoMode ? <ConnectBanner onConnect={connect} /> : null}

        {view === 'dashboards' ? (
          <DashboardsView
            dashboards={dashboards}
            isLoading={!demoMode && live.isLoading}
            isError={!demoMode && live.isError}
            demo={demoMode}
            onReorder={handleReorder}
            onAddDashboard={openAddDashboard}
            onActiveChange={setActiveDashboardId}
          />
        ) : view === 'transactions' ? (
          <TransactionsScreen
            demo={demoMode}
            onConnect={connect}
            viewMode={activityViewMode}
            onViewModeChange={setActivityViewMode}
          />
        ) : view === 'accounts' ? (
          <AccountsScreen
            demo={demoMode}
            onConnect={connect}
            sync={demoMode ? undefined : sync}
          />
        ) : (
          <SettingsScreen
            demoMode={demoMode}
            liveAvailable={hasAccounts}
            onConnect={connect}
            onReplayOnboarding={() => ob.reset()}
            sync={demoMode ? undefined : sync}
          />
        )}

        {view === 'dashboards' ? (
          <DashboardTray
            dashboards={dashboards.map((d) => ({
              id: d.id,
              name: d.name,
              icon: d.icon,
            }))}
            activeId={activeDashboardId ?? dashboards[0]?.id ?? null}
            open={dashTrayOpen}
            onClose={() => setDashTrayOpen(false)}
            onJump={jumpToDashboard}
            onReorder={handleReorder}
            onAdd={openAddDashboard}
          />
        ) : null}

        <TabBar
          active={view}
          onChange={changeTab}
          dashboardLabel={
            view === 'dashboards' ? activeDashboard?.name : undefined
          }
          dashboardIcon={
            activeDashboard
              ? emojiFor(activeDashboard.id, activeDashboard.icon)
              : DEFAULT_DASHBOARD_EMOJI
          }
          dashboardTrayOpen={dashTrayOpen}
          onDashboardsActivate={() => setDashTrayOpen((o) => !o)}
          syncing={!demoMode && Boolean(sync.busy)}
        />
        <ConnectDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          onConnected={handleConnected}
        />
        <Toaster />

        {celebrating ? (
          <PostConnectCelebration
            onDismiss={() => {
              setCelebrating(false)
              setView('dashboards')
            }}
          />
        ) : null}
      </AppFrameContent>
    </div>
  )
}
