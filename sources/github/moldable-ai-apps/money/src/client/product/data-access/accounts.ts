/**
 * Accounts, connections, sync, and the inline Plaid connect flow for the product.
 *
 * Connect reuses the proven backend mechanism: `POST /api/plaid/connect-session`
 * returns a `/plaid/connect?session=…` URL that we open in the user's external
 * browser (via `moldable:open-url`). That page (the `App`/`PlaidExternalConnect`
 * route) runs Plaid Link + `complete-link`. Back in the product we poll
 * `/api/connections` until the new institution appears, then refresh everything.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { timeAgo } from '../../ui-kit/lib/format'
import { showToast } from '../components/Toaster'

/** Plain-English summary line for a completed sync, for a toast. */
function syncToast(res: SyncResult, scope: 'all' | 'one') {
  if (res.status === 'already-syncing') return
  const failed = res.failedConnections ?? 0
  if (failed > 0) {
    showToast({
      id: 'sync',
      tone: 'warning',
      title: 'Synced with issues',
      description: `${failed} ${failed === 1 ? 'account' : 'accounts'} couldn’t update.`,
    })
  } else {
    showToast({
      id: 'sync',
      tone: 'success',
      title: scope === 'one' ? 'Account synced' : 'You’re up to date',
      description: res.refreshedMetrics
        ? `${res.refreshedMetrics} cards refreshed`
        : undefined,
    })
  }
}

export interface ProductCoverage {
  requested?: boolean
  imported?: boolean
  count?: number
  suggestedByAccounts?: boolean
  suggestedAccountCount?: number
}

export interface SyncNextAction {
  action?: string
  reason?: string
  rpc?: string
  product?: string
  products?: string[]
}

export interface MoneyConnection {
  itemId: string
  institutionId?: string
  institutionName?: string
  /** 'connected' | 'error' | 'login_required' | … */
  status: string
  products?: string[]
  connectedAt?: string
  lastSyncAt?: string
  /** Per-item imported fact counts (accounts, transactions, …). */
  counts?: Record<string, number | undefined>
  /** Per-product import coverage; powers "still importing" / "add product" hints. */
  productCoverage?: Record<string, ProductCoverage>
  warnings?: Array<{ code?: string; message?: string } | string>
  nextAction?: SyncNextAction | null
  nextActions?: SyncNextAction[]
  /** Plain-text error persisted for this item after a failed sync. */
  lastError?: string
  error?: { code?: string; message?: string } | null
}

export interface MoneyAccount {
  id: string
  source?: 'plaid' | 'manual' | 'seed'
  connectionId?: string
  itemId?: string
  institutionName?: string
  name: string
  officialName?: string
  type?: string
  subtype?: string
  mask?: string
  currentBalance?: number
  isoCurrencyCode?: string
  asOf?: string
  updatedAt?: string
  /** Signed contribution to net worth in the account's NATIVE currency. */
  valueForSum?: number | null
  /** FX-normalized value in the workspace reporting currency, when available. */
  reportingValue?: number | null
  reportingCurrency?: string
  isAsset?: boolean
  isLiability?: boolean
  creditLimit?: number
  availableCredit?: number
  utilization?: number
  investmentAccountKind?: string
  taxTreatment?: string
}

export interface SyncState {
  /** 'idle' while nothing is running; 'syncing' during an ETL pass; 'error'. */
  status?: string
  lastSyncAt?: string
  lastAttemptAt?: string
  lastTrigger?: string
}

/** The async load/materialize leg (GET /api/warehouse/status). */
export interface WarehouseStatus {
  busy?: boolean
  importing?: boolean
  recomputing?: boolean
  job?: { state?: string; phase?: string } | null
}

export interface SyncStatus {
  generatedAt?: string
  syncState?: SyncState
  classification?: {
    classifying?: boolean
    state?: string
    processed?: number
    total?: number
    applied?: number
    proposed?: number
    skipped?: number
  }
  counts?: {
    connections?: number
    activeConnections?: number
    errorConnections?: number
    accounts?: number
    transactions?: number
    [k: string]: number | undefined
  }
  /** Per-connection summaries (same shape as GET /api/connections). */
  items?: MoneyConnection[]
  nextActions?: SyncNextAction[]
  schedule?: { due?: boolean; reason?: string }
  /** The async materialize leg, merged in by the poller. */
  warehouse?: WarehouseStatus | null
}

export function openExternalUrl(url: string) {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage({ type: 'moldable:open-url', url }, '*')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function useConnections(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'connections', workspaceId],
    enabled,
    queryFn: async (): Promise<MoneyConnection[]> => {
      const res = await fetchWithWorkspace('/api/connections')
      if (!res.ok) throw new Error('Failed to load connections')
      return res.json()
    },
  })
}

export function useAccountsList(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'accounts', workspaceId],
    enabled,
    queryFn: async (): Promise<MoneyAccount[]> => {
      const res = await fetchWithWorkspace('/api/accounts')
      if (!res.ok) throw new Error('Failed to load accounts')
      const body = await res.json()
      return body.accounts ?? []
    },
  })
}

export interface BalanceSnapshot {
  id: string
  kind: string
  date: string
  value: number
  currencyCode?: string
}

/**
 * Monthly/daily balance snapshots for trend surfaces. `kind` is one of
 * `netWorth` | `assets` | `liabilities` | `investment` (aggregate rows) or
 * `account` (per-account). History accrues one row per sync/import, so a fresh
 * workspace starts with a single point and the trend fills in over time.
 */
export function useBalanceSnapshots(kind: string, enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'balance-snapshots', workspaceId, kind],
    enabled,
    queryFn: async (): Promise<BalanceSnapshot[]> => {
      const res = await fetchWithWorkspace(
        `/api/balance-snapshots?kind=${encodeURIComponent(kind)}&limit=120`,
      )
      if (!res.ok) throw new Error('Failed to load balance history')
      const body = await res.json()
      const rows: BalanceSnapshot[] = body.snapshots ?? []
      return [...rows].sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}

const SYNC_STATUS_KEY = (workspaceId: string) =>
  ['money', 'sync-status', workspaceId] as const

/**
 * Live sync/ETL activity. Polls `/api/sync/status` and surfaces whether an ETL
 * pass is in flight (`syncing`). Polls fast (every 2s) while a sync is running
 * so the processing UI stays responsive, and slowly (every 25s) when idle so we
 * still notice background/scheduled/agent-triggered syncs. When a pass finishes
 * (syncing → idle), it invalidates every money/ui-kit query so dashboards,
 * balances and counts refresh with the freshly-loaded data.
 */
export function useSyncActivity(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const wasSyncing = useRef(false)
  const lastCompletedRef = useRef<string | undefined>(undefined)

  const query = useQuery({
    queryKey: SYNC_STATUS_KEY(workspaceId),
    enabled,
    refetchIntervalInBackground: true,
    refetchInterval: (q) =>
      isActive(q.state.data as SyncStatus | undefined) ? 1800 : 25000,
    queryFn: async (): Promise<SyncStatus> => {
      // Sync extract leg + async load/materialize leg, in one tick.
      const [statusRes, whRes] = await Promise.all([
        fetchWithWorkspace('/api/sync/status'),
        fetchWithWorkspace('/api/warehouse/status').catch(() => null),
      ])
      if (!statusRes.ok) throw new Error('Failed to load sync status')
      const status: SyncStatus = await statusRes.json()
      let warehouse: WarehouseStatus | null
      if (whRes && whRes.ok) {
        warehouse = await whRes.json().catch(() => null)
      } else if (whRes === null) {
        // The fetch itself rejected (network blip): keep the last-known value so
        // one bad poll can't false-complete an in-flight materialize.
        warehouse =
          queryClient.getQueryData<SyncStatus>(SYNC_STATUS_KEY(workspaceId))
            ?.warehouse ?? null
      } else {
        // A response we didn't like (e.g. 404 cold boot): treat as not busy.
        warehouse = null
      }
      return { ...status, warehouse }
    },
  })

  const active = isActive(query.data)
  const completedAt = query.data?.syncState?.lastSyncAt

  // Pull fresh facts into every surface the moment a pass completes — whether we
  // caught it in flight (active → idle) OR only saw the result (lastSyncAt
  // advanced, e.g. a background/scheduled sync shorter than the idle poll gap).
  useEffect(() => {
    const settled = wasSyncing.current && !active
    const advanced =
      lastCompletedRef.current !== undefined &&
      Boolean(completedAt) &&
      completedAt !== lastCompletedRef.current
    if (settled || advanced) {
      void queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return (
            (k === 'money' || k === 'ui-kit') && q.queryKey[1] !== 'sync-status'
          )
        },
      })
    }
    wasSyncing.current = active
    lastCompletedRef.current = completedAt
  }, [active, completedAt, queryClient])

  return {
    ...query,
    syncing: query.data?.syncState?.status === 'syncing',
    processing: Boolean(query.data?.warehouse?.busy),
    classifying: Boolean(query.data?.classification?.classifying),
    active,
    syncState: query.data?.syncState,
    warehouse: query.data?.warehouse ?? null,
    items: query.data?.items ?? [],
    counts: query.data?.counts,
  }
}

/** Any ETL leg in flight: the synchronous extract or the async materialize. */
function isActive(d?: SyncStatus): boolean {
  return (
    d?.syncState?.status === 'syncing' ||
    Boolean(d?.warehouse?.busy) ||
    Boolean(d?.classification?.classifying)
  )
}

/** Back-compat alias for the older name. */
export const useSyncStatus = useSyncActivity

/** Invalidate every money query so the UI reflects fresh facts. */
function useRefreshAll() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
    })
  }, [queryClient])
}

/**
 * Optimistically flip the cached sync status to `syncing` the instant a user
 * triggers a sync, so the processing UI appears with zero lag (the poll then
 * confirms or clears it). Returns the previous status for rollback on error.
 */
function useOptimisticSyncing() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  return useCallback(() => {
    const key = SYNC_STATUS_KEY(workspaceId)
    const prev = queryClient.getQueryData<SyncStatus>(key)
    queryClient.setQueryData<SyncStatus>(key, (old) =>
      old
        ? { ...old, syncState: { ...old.syncState, status: 'syncing' } }
        : { syncState: { status: 'syncing' } },
    )
    return prev
  }, [queryClient, workspaceId])
}

export interface SyncResult {
  ok?: boolean
  status?: string
  syncedConnections?: number
  failedConnections?: number
  accounts?: number
  transactions?: number
  debts?: number
  holdings?: number
  removedTransactions?: number
  refreshedMetrics?: number
  errors?: Array<{ itemId?: string; message?: string }>
}

/** A workspace-wide sync is already running — a benign no-op, not an error. */
function alreadySyncing(
  res: Response,
  body: { error?: { message?: string } },
): SyncResult | null {
  return res.status === 409
    ? { ok: true, status: 'already-syncing', ...body }
    : null
}

/**
 * Sync every connected institution (full ETL pass). Completion invalidation is
 * owned by the `useSyncActivity` active→idle edge (so it runs exactly once),
 * not here — this mutation only flips the optimistic state and refreshes the
 * status poll.
 */
export function useSyncNow() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const markSyncing = useOptimisticSyncing()
  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const res = await fetchWithWorkspace('/api/sync', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      return (
        alreadySyncing(res, body) ??
        (res.ok
          ? body
          : Promise.reject(new Error(body?.error?.message ?? 'Sync failed')))
      )
    },
    onMutate: () => ({ prev: markSyncing() }),
    onError: (e, _v, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(SYNC_STATUS_KEY(workspaceId), ctx.prev)
      showToast({
        id: 'sync',
        tone: 'error',
        title: 'Couldn’t sync',
        description: (e as Error).message,
      })
    },
    onSuccess: (res) => syncToast(res, 'all'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SYNC_STATUS_KEY(workspaceId) }),
  })
}

/**
 * Sync a single institution by itemId (`POST /api/connections/:itemId/sync`).
 * The mutation's `variables` is the itemId, so callers can show a per-card
 * spinner via `sync.isPending && sync.variables === itemId`.
 */
export function useSyncConnection() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const markSyncing = useOptimisticSyncing()
  return useMutation({
    mutationFn: async (itemId: string): Promise<SyncResult> => {
      const res = await fetchWithWorkspace(
        `/api/connections/${encodeURIComponent(itemId)}/sync`,
        { method: 'POST' },
      )
      const body = await res.json().catch(() => ({}))
      return (
        alreadySyncing(res, body) ??
        (res.ok
          ? body
          : Promise.reject(new Error(body?.error?.message ?? 'Sync failed')))
      )
    },
    onMutate: () => ({ prev: markSyncing() }),
    onError: (e, _v, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(SYNC_STATUS_KEY(workspaceId), ctx.prev)
      showToast({
        id: 'sync',
        tone: 'error',
        title: 'Couldn’t sync',
        description: (e as Error).message,
      })
    },
    onSuccess: (res) => syncToast(res, 'one'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SYNC_STATUS_KEY(workspaceId) }),
  })
}

/**
 * Reconnect an institution through Plaid Link's **update mode**, keeping the
 * existing Item and its imported history intact. This covers explicit
 * `needs_reauth` states and recoverable provider errors such as `NO_ACCOUNTS`;
 * it never disconnects and re-adds the institution.
 */
export function useReconnect() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  const [awaitingItemId, setAwaitingItemId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (stopRef.current) clearTimeout(stopRef.current)
    pollRef.current = null
    stopRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const reconnect = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetchWithWorkspace('/api/plaid/connect-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.url) {
        throw new Error(body?.error?.message ?? 'Could not start reconnect')
      }
      openExternalUrl(body.url)
      return { itemId, ...body }
    },
    onError: (e) =>
      showToast({
        tone: 'error',
        title: 'Couldn’t start reconnect',
        description: (e as Error).message,
      }),
    onSuccess: ({ itemId }) => {
      cleanup()
      setAwaitingItemId(itemId)
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetchWithWorkspace('/api/connections')
          if (!res.ok) return
          const connections: MoneyConnection[] = await res.json()
          const connection = connections.find(
            (entry) => entry.itemId === itemId,
          )
          if (connection?.status === 'connected' && !connection.lastError) {
            cleanup()
            setAwaitingItemId(null)
            await refreshAll()
            showToast({
              tone: 'success',
              title: 'Account reconnected',
              description: 'Syncing the latest account details now.',
            })
            const syncRes = await fetchWithWorkspace(
              `/api/connections/${encodeURIComponent(itemId)}/sync`,
              { method: 'POST' },
            )
            if (!syncRes.ok) {
              const body = await syncRes.json().catch(() => ({}))
              showToast({
                tone: 'warning',
                title: 'Reconnected, but couldn’t sync yet',
                description:
                  body?.error?.message ?? 'Try syncing this account again.',
              })
            }
            await refreshAll()
          }
        } catch {
          // Keep waiting while the user completes the secure browser handoff.
        }
      }, 2_500)
      stopRef.current = setTimeout(
        () => {
          cleanup()
          setAwaitingItemId((current) => (current === itemId ? null : current))
        },
        10 * 60 * 1000,
      )
    },
  })

  return {
    ...reconnect,
    awaitingItemId,
    isAwaiting: (itemId: string) => awaitingItemId === itemId,
  }
}

export function useDisconnect() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetchWithWorkspace(
        `/api/connections/${encodeURIComponent(itemId)}`,
        {
          method: 'DELETE',
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to disconnect')
      return body
    },
    onSuccess: () => refreshAll(),
  })
}

/* ------------------------------------------------- manual assets/accounts */

export type ManualAccountType =
  | 'cash'
  | 'investment'
  | 'other'
  | 'loan'
  | 'mortgage'
  | 'credit'

export interface ManualAccountInput {
  id?: string
  name: string
  type: ManualAccountType
  subtype?: string
  currentBalance: number
  isoCurrencyCode?: string
  isAsset?: boolean
  isLiability?: boolean
  investmentAccountKind?: string
  /** User-set "as of" / last-updated date (ISO). */
  asOf?: string
}

/** Create a manual account/asset (e.g. a home value) → flows into net worth. */
export function useAddManualAccount() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  return useMutation({
    mutationFn: async (input: ManualAccountInput): Promise<MoneyAccount> => {
      const res = await fetchWithWorkspace('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isoCurrencyCode: 'USD', ...input }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Couldn’t add this asset')
      return body.account ?? body
    },
    onSuccess: () => refreshAll(),
  })
}

/** Update a manual account by id (PATCH). */
export function useUpdateManualAccount() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: ManualAccountInput & { id: string }): Promise<MoneyAccount> => {
      const res = await fetchWithWorkspace(
        `/api/accounts/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Couldn’t update this asset')
      return body.account ?? body
    },
    onSuccess: () => refreshAll(),
  })
}

/** Delete a manual account by id. */
export function useDeleteManualAccount() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(
        `/api/accounts/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Couldn’t remove this asset')
      return body
    },
    onSuccess: () => refreshAll(),
  })
}

/* ------------------------------------------------------------ sync model */

export type SyncPhase = 'idle' | 'syncing' | 'processing' | 'error'

export interface SyncModel {
  /** Coarse state for the UI. */
  phase: SyncPhase
  /** One-line status copy ("Syncing your accounts…", "Updated 4m ago", …). */
  label: string
  busy: boolean
  lastSyncAt?: string
  lastAttemptAt?: string
  /** Last successful sync older than a day (no error, just old). */
  isStale: boolean
  /** Connections in an error OR needs_reauth state (anything wanting attention). */
  errorConnections: number
  items: MoneyConnection[]
  /** The itemId currently being synced via runOne, if any. */
  pendingItemId: string | null
  /** Sync every connection. */
  runAll: () => void
  /** Sync a single connection by itemId. */
  runOne: (itemId: string) => void
  /** Latest sync result (counts/errors) for a toast, if any. */
  result?: SyncResult
  /** Last sync refreshed data but ≥1 institution failed (200 + failedConnections). */
  partialFailedCount: number
  /** Error from the last sync mutation, if it failed outright (502 / network). */
  error?: string | null
}

const STALE_MS = 24 * 60 * 60 * 1000

function latestIso(...values: Array<string | undefined>): string | undefined {
  let latest: string | undefined
  let latestMs = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (!value) continue
    const ms = Date.parse(value)
    if (!Number.isFinite(ms) || ms <= latestMs) continue
    latest = value
    latestMs = ms
  }
  return latest
}

function warehouseLabel(w?: WarehouseStatus | null): string | undefined {
  if (!w?.busy) return undefined
  if (w.recomputing) return 'Building your dashboards…'
  if (w.importing) return 'Importing transactions…'
  return 'Crunching the numbers…'
}

/**
 * The single source of truth every sync surface reads, composing the live
 * activity poll with the in-flight mutation states. Mount once (in MoneyApp)
 * and pass down so the global pill, the Accounts header, and each connection
 * row all agree — and so the workspace-wide sync lock can disable sibling
 * "Sync" buttons while any sync runs.
 */
export function useSyncStatusModel(enabled = true): SyncModel {
  const activity = useSyncActivity(enabled)
  const syncAll = useSyncNow()
  const syncOne = useSyncConnection()

  const mutating = syncAll.isPending || syncOne.isPending
  const syncing = activity.syncing || mutating
  const processing = !syncing && activity.processing
  const busy = syncing || processing
  // Drive "attention" off the per-item statuses, not the backend's
  // `errorConnections` scalar — that scalar excludes `needs_reauth`, which is
  // the single most actionable state and must not look healthy.
  const needsReauth = activity.items.some((i) => i.status === 'needs_reauth')
  const attention = activity.items.filter(
    (i) => i.status === 'error' || i.status === 'needs_reauth',
  ).length
  const lastSyncAt = latestIso(
    activity.syncState?.lastSyncAt,
    ...activity.items.map((item) => item.lastSyncAt),
  )
  const lastAttemptAt = activity.syncState?.lastAttemptAt
  const isStale =
    !busy &&
    Boolean(lastSyncAt) &&
    Date.now() - Date.parse(lastSyncAt as string) > STALE_MS

  const phase: SyncPhase = syncing
    ? 'syncing'
    : processing
      ? 'processing'
      : attention > 0
        ? 'error'
        : 'idle'

  const label = syncing
    ? (warehouseLabel(activity.warehouse) ?? 'Syncing your accounts…')
    : processing
      ? (warehouseLabel(activity.warehouse) ?? 'Updating your dashboards…')
      : attention > 0
        ? needsReauth
          ? `${attention} ${attention === 1 ? 'account needs' : 'accounts need'} reconnecting`
          : `${attention} ${attention === 1 ? 'account needs' : 'accounts need'} attention`
        : lastSyncAt
          ? `Updated ${timeAgo(lastSyncAt)}`
          : 'Not synced yet'

  const result = syncOne.data ?? syncAll.data

  return {
    phase,
    label,
    busy,
    lastSyncAt,
    lastAttemptAt,
    isStale,
    errorConnections: attention,
    items: activity.items,
    pendingItemId: syncOne.isPending ? (syncOne.variables as string) : null,
    runAll: () => syncAll.mutate(),
    runOne: (itemId: string) => syncOne.mutate(itemId),
    result,
    partialFailedCount: result?.failedConnections ?? 0,
    error:
      (syncAll.error as Error | null)?.message ??
      (syncOne.error as Error | null)?.message ??
      null,
  }
}

export interface SyncSettings {
  settings: {
    display?: { dataMode?: 'live' | 'demo' }
    sync?: {
      scheduledRefreshEnabled?: boolean
      intervalMinutes?: number
      autoAcceptCategorization?: boolean
    }
  }
  syncState?: { status?: string; lastSyncAt?: string }
  classification?: SyncStatus['classification']
  due?: boolean
  reason?: string
}

export function useSyncSettings() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'sync-settings', workspaceId],
    queryFn: async (): Promise<SyncSettings> => {
      const res = await fetchWithWorkspace('/api/sync/settings')
      if (!res.ok) throw new Error('Failed to load sync settings')
      return res.json()
    },
  })
}

export function useUpdateSyncSettings() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: {
      scheduledRefreshEnabled?: boolean
      intervalMinutes?: number
      autoAcceptCategorization?: boolean
    }) => {
      const res = await fetchWithWorkspace('/api/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to update settings')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['money', 'sync-settings'] }),
  })
}

export type ConnectPhase =
  | 'idle'
  | 'starting'
  | 'awaiting'
  | 'success'
  | 'error'

/**
 * Inline connect: create a Plaid connect session, open it in the external
 * browser, then poll `/api/connections` until a new institution appears.
 */
export function useConnect() {
  const { fetchWithWorkspace } = useWorkspace()
  const refreshAll = useRefreshAll()
  const [phase, setPhase] = useState<ConnectPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (stopRef.current) clearTimeout(stopRef.current)
    pollRef.current = null
    stopRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const cancel = useCallback(() => {
    cleanup()
    setPhase('idle')
    setError(null)
  }, [cleanup])

  const start = useCallback(async () => {
    setError(null)
    setPhase('starting')
    try {
      const baselineRes = await fetchWithWorkspace('/api/connections')
      const baseline: MoneyConnection[] = baselineRes.ok
        ? await baselineRes.json()
        : []
      const baselineIds = new Set(baseline.map((c) => c.itemId))

      const res = await fetchWithWorkspace('/api/plaid/connect-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: ['transactions'],
          optionalProducts: ['liabilities', 'investments'],
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.url) {
        throw new Error(
          body?.error?.message ?? 'Could not start the connection',
        )
      }
      openExternalUrl(body.url)
      setPhase('awaiting')

      cleanup()
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetchWithWorkspace('/api/connections')
          if (!pollRes.ok) return
          const current: MoneyConnection[] = await pollRes.json()
          const appeared = current.some((c) => !baselineIds.has(c.itemId))
          if (appeared) {
            cleanup()
            await refreshAll()
            setPhase('success')
          }
        } catch {
          // keep polling
        }
      }, 2500)

      // Give up the active poll after a few minutes; the user can retry.
      stopRef.current = setTimeout(
        () => {
          cleanup()
          setPhase((p) => (p === 'awaiting' ? 'idle' : p))
        },
        5 * 60 * 1000,
      )
    } catch (e) {
      cleanup()
      setError(
        e instanceof Error ? e.message : 'Could not start the connection',
      )
      setPhase('error')
    }
  }, [fetchWithWorkspace, refreshAll, cleanup])

  return { phase, error, start, cancel }
}

export interface PlaidReadiness {
  /** Plaid Production keys are configured and a link token can be minted. */
  ready: boolean
  /** The user hasn't supplied their own PLAID_CLIENT_ID / PLAID_SECRET yet. */
  credentialsMissing: boolean
  message?: string
  /** Copyable `aivault secrets create …` commands for the headless path. */
  setupCommands?: string[]
}

/**
 * Probe whether the user's own Plaid keys are configured, so the connect dialog
 * can show "add your keys" setup guidance up front instead of a dead-end error
 * after a failed connect attempt. Backed by `POST /api/plaid/readiness`, which
 * returns `{ ok, error?: { code, message, setupCommands } }` — `ok:false` with
 * code `plaid_credentials_missing` is the fresh-user (no keys yet) case. Gated to
 * when the dialog is open and cached briefly so opening it doesn't re-probe.
 */
export function usePlaidReadiness(enabled: boolean) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'plaid-readiness', workspaceId],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<PlaidReadiness> => {
      const res = await fetchWithWorkspace('/api/plaid/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json().catch(() => ({}) as Record<string, unknown>)
      const error = (
        body as {
          error?: { code?: string; message?: string; setupCommands?: string[] }
        }
      ).error
      return {
        ready: Boolean((body as { ok?: boolean }).ok),
        credentialsMissing: error?.code === 'plaid_credentials_missing',
        message: error?.message,
        setupCommands: error?.setupCommands,
      }
    },
  })
}
