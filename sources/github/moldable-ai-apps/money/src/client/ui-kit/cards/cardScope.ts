import type { EvaluatedCard } from '../lib/types'

/**
 * A card's *time scope* — the answer to "what range is this number?". Cards fall
 * into a few honestly-distinct kinds, and only some are re-windowable:
 *
 * - `window`   — a flow summed over a period (Expenses this month, last 6 months).
 *                The number is meaningless without the window, so we always label
 *                it, and it can be re-scoped to another period.
 * - `trend`    — a time series; the range is the x-axis span.
 * - `point`    — a snapshot of *now* (net worth, balances, utilization). No range;
 *                it's "as of" the latest data. Re-windowing makes no sense.
 * - `forecast` — forward-looking (runway, projections, bills due soon). Labelled by
 *                horizon, not a historical window.
 * - `open`     — a current outstanding set (reimbursements owed, items to review).
 *
 * The window today lives only in the formula string, so we derive scope from the
 * formula + referencedCollections. When the backend starts emitting an
 * authoritative `card.scope`, we prefer it (forward-compatible).
 */
export type ScopeKind = 'window' | 'trend' | 'point' | 'forecast' | 'open'

/** Coarse period vocabulary used by the re-window control. */
export type CardPeriod = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'

export interface CardScope {
  kind: ScopeKind
  /** Short human label for the badge, e.g. "This month", "As of today". */
  label: string
  /** The current coarse period, when the scope maps to one. */
  period?: CardPeriod
  /** True when the user could meaningfully re-scope this card to another period. */
  rangeable: boolean
}

/** Periods offered by the re-window control, in order. */
export const RANGE_PERIODS: Array<{
  id: CardPeriod
  label: string
  short: string
}> = [
  { id: '1M', label: 'This month', short: '1M' },
  { id: '3M', label: 'Last 3 months', short: '3M' },
  { id: '6M', label: 'Last 6 months', short: '6M' },
  { id: 'YTD', label: 'Year to date', short: 'YTD' },
  { id: '1Y', label: 'Last 12 months', short: '1Y' },
  { id: 'ALL', label: 'All time', short: 'All' },
]

// Collections that represent current balances / state (no time dimension).
const POINT_COLLECTIONS =
  /\b(Accounts|Assets|Liabilities|Cash|CardAccounts|Debt|Investments|Holdings|LiquidAssets|IlliquidAssets|TaxSheltered)\b/
// Transaction / flow collections — a sum over these needs a window to mean anything.
const FLOW_COLLECTIONS =
  /\b(Expenses|Income|CashFlow|Transfers|Transactions|MoneyFlows|Merchants|Subscriptions|RecurringObligations|SharedExpenses|JoyReview|TaxContributions|BudgetLabels)\b/
// Review/recommendation collections — an outstanding set, not a time window.
const OPEN_COLLECTIONS = /\b(ReviewActions|Warnings|Opportunities)\b/
// Forward-looking domain functions.
const FORECAST_FNS = /\b(Runway|FreedomAge|Forecast|ForecastScenario)\b/

function pluralDays(n: number): string {
  return n === 1 ? '1 day' : `${n} days`
}

function rollingLabel(arg: string): { label: string; period?: CardPeriod } {
  const m = /^(\d+)\s*(d|w|mo|m|y)$/i.exec(arg.trim())
  if (!m) return { label: 'Rolling' }
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  if (unit === 'd')
    return {
      label: `Last ${pluralDays(n)}`,
      period: n <= 31 ? '1M' : undefined,
    }
  if (unit === 'w') return { label: `Last ${n} weeks` }
  if (unit === 'y')
    return {
      label: n === 1 ? 'Last 12 months' : `Last ${n} years`,
      period: n === 1 ? '1Y' : undefined,
    }
  // months
  const period: CardPeriod | undefined =
    n === 1
      ? '1M'
      : n === 3
        ? '3M'
        : n === 6
          ? '6M'
          : n === 12
            ? '1Y'
            : undefined
  return { label: n === 1 ? 'This month' : `Last ${n} months`, period }
}

/** True for collections whose sum needs a window (so re-scoping is meaningful). */
function referencesFlow(card: EvaluatedCard): boolean {
  const haystack = [
    card.formula,
    card.primaryFormula,
    ...(card.referencedCollections ?? []),
  ]
    .filter(Boolean)
    .join(' ')
  return FLOW_COLLECTIONS.test(haystack) && !OPEN_COLLECTIONS.test(haystack)
}

/**
 * Derive a card's time scope. Prefers a backend-supplied `card.scope` when
 * present; otherwise infers it from the formula and referenced collections.
 */
export function cardScope(card: EvaluatedCard): CardScope {
  const backend = card.scope
  if (backend?.kind && backend.label) {
    return {
      kind: backend.kind,
      label: backend.label,
      period: backend.period,
      rangeable: backend.rangeable,
    }
  }

  const formula = card.formula ?? card.primaryFormula ?? ''

  // Trend / time series — the range is the chart's span.
  if (card.kind === 'trend' || /\.Trend\(/.test(formula)) {
    return { kind: 'trend', label: 'Trend', rangeable: true }
  }

  // Forward-looking horizons.
  const dueSoon = /\.DueSoon\(\s*([^)]*?)\s*\)/.exec(formula)
  if (dueSoon) {
    const m = /^(\d+)\s*(d|w|mo)$/i.exec(dueSoon[1].trim())
    const label = m
      ? m[2].toLowerCase() === 'd'
        ? `Next ${pluralDays(Number(m[1]))}`
        : m[2].toLowerCase() === 'w'
          ? `Next ${m[1]} weeks`
          : `Next ${m[1]} months`
      : 'Upcoming'
    return { kind: 'forecast', label, rangeable: false }
  }
  if (card.kind === 'forecast' || FORECAST_FNS.test(formula)) {
    return { kind: 'forecast', label: 'Projection', rangeable: false }
  }

  // Explicit windows on a flow.
  if (/\.ThisMonth\(\)/.test(formula))
    return {
      kind: 'window',
      label: 'This month',
      period: '1M',
      rangeable: true,
    }
  if (/\.LastMonth\(\)/.test(formula))
    return { kind: 'window', label: 'Last month', rangeable: true }
  if (/\.YTD\(\)/.test(formula))
    return {
      kind: 'window',
      label: 'Year to date',
      period: 'YTD',
      rangeable: true,
    }
  if (/\.ThisYear\(\)/.test(formula))
    return { kind: 'window', label: 'This year', period: '1Y', rangeable: true }
  if (/\.LastYear\(\)/.test(formula))
    return { kind: 'window', label: 'Last year', rangeable: true }
  const rolling = /\.Rolling\(\s*([^)]*?)\s*\)/.exec(formula)
  if (rolling) {
    const r = rollingLabel(rolling[1])
    return { kind: 'window', label: r.label, period: r.period, rangeable: true }
  }
  if (/\.Between\(/.test(formula))
    return { kind: 'window', label: 'Custom range', rangeable: true }

  // Outstanding / review sets.
  if (OPEN_COLLECTIONS.test(formula) || /status\s*=\s*"owed"/.test(formula)) {
    return { kind: 'open', label: 'Outstanding', rangeable: false }
  }

  // A flow with no window method = silently all-time (e.g. Transactions.GroupBy(direction)).
  // Label it honestly and let the user scope it.
  if (referencesFlow(card)) {
    return { kind: 'window', label: 'All time', period: 'ALL', rangeable: true }
  }

  // Balances / current state.
  if (POINT_COLLECTIONS.test(formula)) {
    return { kind: 'point', label: 'As of today', rangeable: false }
  }

  // Fallback: don't claim a window we can't justify.
  return { kind: 'point', label: '', rangeable: false }
}
