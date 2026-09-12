import { CalendarClock, Loader2, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Button, cn } from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import { CardShell } from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import { MicroLabel } from '../../ui-kit/cards/atoms'
import {
  type RecurringSeries,
  type ReviewActionPayload,
  useRecurringAction,
  useRecurringSeries,
} from '../data-access/recurring'

/** Subscriptions & recurring bills — see the monthly load, keep / skip / cancel. */
export function SubscriptionsScreen({ demo = false }: { demo?: boolean }) {
  const query = useRecurringSeries('subscription', !demo)
  const act = useRecurringAction()
  const [pendingActionKeys, setPendingActionKeys] = useState<Set<string>>(
    () => new Set(),
  )

  const series = useMemo(
    () => (demo ? [] : (query.data?.series ?? [])),
    [demo, query.data?.series],
  )
  const active = series.filter((s) => s.status === 'active')
  const groups = useMemo(() => groupSubscriptionSeries(series), [series])
  const monthly = active.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0)
  const loading = !demo && query.isLoading

  if (demo) {
    return (
      <div className="border-border/70 bg-card/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center">
        <Repeat className="text-muted-foreground size-8" />
        <p className="font-medium">Your subscriptions, all in one place</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Connect an account and we’ll detect recurring charges — keep, skip, or
          cancel each.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardShell key={i} title="Loading" state="loading" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <CardShell
        title="Subscriptions"
        state="error"
        errorMessage="Couldn’t load subscriptions."
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (series.length === 0) {
    return (
      <div className="border-border/70 bg-card/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
        <Repeat className="text-muted-foreground size-7" />
        <p className="font-medium">No subscriptions detected yet</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          As recurring charges build up, they’ll show up here to manage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border-border/60 bg-card rounded-2xl border p-4">
        <MicroLabel>Monthly subscriptions</MicroLabel>
        <div className="uk-nums mt-1 text-[1.9rem] font-semibold tracking-tight">
          {formatMoney(monthly)}
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {active.length} active · {formatMoney(monthly * 12)}/yr
        </div>
      </div>

      <ul className="space-y-2">
        {groups.map((group) => {
          const rowKey = group.key
          const pendingPrefix = `${rowKey}:`
          const busyAction =
            [...pendingActionKeys]
              .find((key) => key.startsWith(pendingPrefix))
              ?.slice(pendingPrefix.length) ?? null
          return (
            <SeriesRow
              key={rowKey}
              group={group}
              busyAction={busyAction}
              onAction={(action, payloads) => {
                const actionKey = `${rowKey}:${action}`
                setPendingActionKeys((current) => {
                  const next = new Set(current)
                  next.add(actionKey)
                  return next
                })
                Promise.all(payloads.map((payload) => act.mutateAsync(payload)))
                  .catch(() => undefined)
                  .finally(() =>
                    setPendingActionKeys((current) => {
                      const next = new Set(current)
                      next.delete(actionKey)
                      return next
                    }),
                  )
              }}
            />
          )
        })}
      </ul>
    </div>
  )
}

interface SubscriptionGroup {
  key: string
  namespace: string
  name: string
  status: string
  cadence: string
  monthlyAmount: number
  nextDueDate?: string
  series: RecurringSeries[]
}

function groupSubscriptionSeries(
  series: RecurringSeries[],
): SubscriptionGroup[] {
  const groups = new Map<string, RecurringSeries[]>()
  for (const entry of series) {
    const key = `${entry.namespace}:${merchantGroupKey(entry.name)}`
    const items = groups.get(key) ?? []
    items.push(entry)
    groups.set(key, items)
  }
  return [...groups.entries()]
    .map(([key, items]) => subscriptionGroup(key, items))
    .sort(compareSubscriptionGroups)
}

function subscriptionGroup(
  key: string,
  series: RecurringSeries[],
): SubscriptionGroup {
  const active = series.filter((entry) => entry.status === 'active')
  const activeOrAll = active.length ? active : series
  const cadences = [...new Set(activeOrAll.map((entry) => entry.cadence))]
  return {
    key,
    namespace: series[0]?.namespace ?? 'subscription',
    name: displayMerchantName(series),
    status: active.length ? 'active' : (series[0]?.status ?? 'dismissed'),
    cadence: cadences.length === 1 ? (cadences[0] ?? 'irregular') : 'multiple',
    monthlyAmount: activeOrAll.reduce(
      (sum, entry) => sum + (entry.monthlyAmount || 0),
      0,
    ),
    nextDueDate: earliestDate(
      activeOrAll
        .map((entry) => entry.nextDueDate)
        .filter((date): date is string => Boolean(date)),
    ),
    series,
  }
}

function merchantGroupKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function displayMerchantName(series: RecurringSeries[]): string {
  return (
    series
      .map((entry) => entry.name.trim())
      .sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ??
    'Subscription'
  )
}

function earliestDate(dates: string[]): string | undefined {
  return dates.sort()[0]
}

function compareSubscriptionGroups(
  a: SubscriptionGroup,
  b: SubscriptionGroup,
): number {
  if (a.status === 'active' && b.status !== 'active') return -1
  if (a.status !== 'active' && b.status === 'active') return 1
  return (
    (a.nextDueDate ?? '9999-12-31').localeCompare(
      b.nextDueDate ?? '9999-12-31',
    ) || a.name.localeCompare(b.name)
  )
}

function SeriesRow({
  group,
  busyAction,
  onAction,
}: {
  group: SubscriptionGroup
  busyAction: string | null
  onAction: (
    action: 'activate' | 'skip' | 'dismiss',
    payloads: ReviewActionPayload[],
  ) => void
}) {
  const dimmed = group.status !== 'active'
  const busy = busyAction !== null
  const activateActions = group.series
    .map((entry) => entry.reviewActions?.activate)
    .filter((action): action is ReviewActionPayload => Boolean(action))
  const skipActions = group.series
    .map((entry) => entry.reviewActions?.skip)
    .filter((action): action is ReviewActionPayload => Boolean(action))
  const dismissActions = group.series
    .map((entry) => entry.reviewActions?.dismiss)
    .filter((action): action is ReviewActionPayload => Boolean(action))
  return (
    <li
      className={cn(
        'border-border/60 bg-card rounded-xl border p-3.5',
        dimmed && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <MerchantChip name={group.name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{group.name}</span>
            {group.series.length > 1 ? (
              <Badge variant="outline" className="text-[10px]">
                {group.series.length} items
              </Badge>
            ) : null}
            {group.status !== 'active' ? (
              <Badge variant="outline" className="text-[10px] capitalize">
                {group.status}
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="capitalize">{group.cadence}</span>
            {group.nextDueDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" />
                {formatDate(group.nextDueDate, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="uk-nums text-sm font-semibold tabular-nums">
            {formatMoney(group.monthlyAmount)}
          </div>
          <div className="text-muted-foreground text-[10px]">/mo</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1.5">
        {busy ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : null}
        {group.status !== 'active' && activateActions.length ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            disabled={busy}
            onClick={() => onAction('activate', activateActions)}
          >
            Keep
          </Button>
        ) : null}
        {skipActions.length ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            disabled={busy}
            title="Hide this series from active subscription totals for now. This does not cancel anything with the merchant."
            onClick={() => onAction('skip', skipActions)}
          >
            Skip once
          </Button>
        ) : null}
        {dismissActions.length ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-7 px-2.5"
            disabled={busy}
            title="Mark this detected series as wrong and remove it from subscription totals. This does not cancel anything with the merchant."
            onClick={() => onAction('dismiss', dismissActions)}
          >
            Not subscription
          </Button>
        ) : null}
      </div>
    </li>
  )
}
