import { Receipt, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import { FOCUS_RING, ICON_BTN } from '../../ui-kit/lib/styles'
import type { EvaluatedCard, MoneyTransactionRow } from '../../ui-kit/lib/types'
import {
  UNCATEGORIZED_CATEGORY,
  categoryEmojiForKey,
  categoryEmojiForLabel,
} from '../lib/categories'
import { CardRenderer } from '../../ui-kit/cards'
import { cardScope } from '../../ui-kit/cards/cardScope'
import {
  drawdownInfo,
  forecastHasList,
  pickRenderer,
  statusIsRing,
} from '../../ui-kit/cards/helpers'
import { TransactionDrilldown } from '../../ui-kit/sections/TransactionDrilldown'
import { useCardRange } from '../data-access/cardRange'
import { CardErrorBoundary } from './CardErrorBoundary'
import { CardRangeControl } from './CardRangeControl'
import {
  type DrillLevel,
  type DrillRow,
  DrilldownDrawer,
} from './DrilldownDrawer'
import { type MasonryCell, MasonryGrid } from './MasonryGrid'

function txToRow(tx: MoneyTransactionRow): DrillRow {
  const label = tx.merchantName || tx.name
  const tone =
    tx.direction === 'income'
      ? 'positive'
      : tx.direction === 'transfer'
        ? 'muted'
        : 'default'
  const sign =
    tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '−' : ''
  return {
    id: tx.id,
    label,
    sublabel: formatDate(tx.date, { month: 'short', day: 'numeric' }),
    chip: label,
    value: `${sign}${formatMoney(Math.abs(tx.amount), { currency: tx.isoCurrencyCode, cents: true })}`,
    tone,
  }
}

// Transaction-backed collections worth a row-level drilldown.
const TX_COLLECTIONS =
  /\b(Expenses?|Income|Subscriptions|RecurringObligations|Merchants|JoyReview|SharedExpenses|TaxContributions|Cash)\b/

/**
 * Emoji for a category breakdown row. Backend group keys are "PRIMARY DETAILED";
 * resolve the detailed token to its emoji, and return '' for the Uncategorized
 * fallback so unknown/rolled-up rows stay clean.
 */
function categoryRowEmoji(key: string): string {
  // Raw Plaid keys are ALL_CAPS_WITH_UNDERSCORES (possibly "PRIMARY DETAILED");
  // overridden groups arrive as the friendly/custom label instead.
  const looksRaw = /_/.test(key) || key === key.toUpperCase()
  if (looksRaw) {
    const detailed = key.includes(' ') ? key.slice(key.indexOf(' ') + 1) : key
    const emoji = categoryEmojiForKey(detailed)
    return emoji === UNCATEGORIZED_CATEGORY.emoji ? '' : emoji
  }
  return categoryEmojiForLabel(key)
}

function isCategoryBreakdown(card: EvaluatedCard): boolean {
  return /GroupBy\(\s*category\s*\)/.test(
    card.formula ?? card.primaryFormula ?? '',
  )
}

function isDrillable(card: EvaluatedCard): boolean {
  const haystack = [
    card.formula,
    card.primaryFormula,
    ...(card.referencedCollections ?? []),
  ]
    .filter(Boolean)
    .join(' ')
  return TX_COLLECTIONS.test(haystack)
}

/**
 * The bento size palette — just two heights so pieces always tessellate: a
 * **small** tile (1 block = 2 base rows ≈ 192px) and a **big** tile (2 blocks =
 * 4 rows ≈ 400px, exactly double). Because big is an integer multiple of small,
 * every hole a big tile leaves is fillable by small tiles — no orphan gaps.
 * Width is 1 or 2 columns. Four resulting shapes (1×1, 1×2-block, 2×1, 2×2) give
 * diversity while staying commensurate.
 *
 * Tile height must be ≥ the card's rendered content — CardShell is
 * `overflow-hidden`, so a card given a too-short tile gets sliced at its border.
 * Most kinds have a fixed footprint, but `forecast` and `status` each have a
 * compact flavor (a stat/gauge) and a tall flavor (a projected amount + list, a
 * full ring + footer). We size those from the flavor, not just the kind.
 */
const SMALL = 2
const BIG = 4

function tileSize(card: EvaluatedCard): { colSpan: number; rowSpan: number } {
  // The compact "living off savings" reframe is a small stat, not a chart.
  if (drawdownInfo(card)) return { colSpan: 1, rowSpan: SMALL }
  switch (pickRenderer(card)) {
    case 'trend':
      return { colSpan: 2, rowSpan: BIG } // hero value + line chart + range switch
    case 'breakdown':
      return { colSpan: 2, rowSpan: BIG } // total + bars; wide reads best
    case 'optimizer':
      return { colSpan: 2, rowSpan: BIG }
    case 'entity-list':
      // A list is fine narrow — keep it 1-wide-tall so it fills the column
      // beside a 2-wide chart/breakdown instead of leaving an empty column.
      return { colSpan: 1, rowSpan: BIG }
    case 'forecast':
      // Hero + caption fits a small tile; add the "largest upcoming" list and it
      // needs the tall tile or the list bleeds out the bottom.
      return forecastHasList(card)
        ? { colSpan: 1, rowSpan: BIG }
        : { colSpan: 1, rowSpan: SMALL }
    case 'status':
      // The ring gauge + secondary-stat footer can't fit a small tile; dotted
      // status counts and plain heroes can.
      return statusIsRing(card)
        ? { colSpan: 1, rowSpan: BIG }
        : { colSpan: 1, rowSpan: SMALL }
    case 'metric':
    case 'comparison':
    default:
      return { colSpan: 1, rowSpan: SMALL } // a stat / duration
  }
}

/**
 * One card in the grid. Owns the optional per-card range control: rangeable,
 * non-trend cards (a flow summed over a window) get a period picker that
 * re-evaluates the card server-side via `useCardRange`; trend cards keep their
 * own in-chart switcher, and point/forecast/open cards get a static scope badge.
 */
function DashboardCardCell({
  card,
  index,
  editing,
  enableDrilldown,
  onOpenTxns,
  onDrillRow,
}: {
  card: EvaluatedCard
  index: number
  editing: boolean
  enableDrilldown: boolean
  onOpenTxns: () => void
  onDrillRow: (key: string, label: string) => void
}) {
  const range = useCardRange(card)
  const scope = cardScope(card)
  const interactive = !editing && enableDrilldown
  const rangeable = interactive && scope.rangeable && scope.kind !== 'trend'
  const display = rangeable ? range.shownCard : card

  // Only category breakdowns map row keys to the `?category=` filter; other
  // groupings (assetClass, person, …) would send a bogus query.
  const rowDrillable =
    interactive && /GroupBy\(\s*category\s*\)/.test(card.formula ?? '')

  const rangeControl = rangeable ? (
    <CardRangeControl
      period={range.period}
      onChange={range.setPeriod}
      loading={range.isFetching}
    />
  ) : null
  const txnsButton =
    interactive && isDrillable(card) ? (
      <button
        type="button"
        onClick={onOpenTxns}
        aria-label="View underlying transactions"
        className={cn('-mr-0.5', ICON_BTN)}
      >
        <Receipt className="size-3.5" />
      </button>
    ) : null
  const action =
    rangeControl || txnsButton ? (
      <>
        {rangeControl}
        {txnsButton}
      </>
    ) : undefined

  return (
    <CardErrorBoundary title={card.title}>
      <CardRenderer
        card={display}
        index={index}
        onDrillRow={rowDrillable ? onDrillRow : undefined}
        categoryEmoji={isCategoryBreakdown(card) ? categoryRowEmoji : undefined}
        action={action}
      />
    </CardErrorBoundary>
  )
}

/**
 * A dashboard's cards in a true masonry — each card at its natural height, no
 * stretching — with per-card transaction drilldown. Single source of truth for
 * how a dashboard's cards lay out on the product detail screen.
 */
export function DashboardGrid({
  cards,
  enableDrilldown = true,
  onRemoveCard,
}: {
  cards: EvaluatedCard[]
  /** Demo-preview cards aren't backed by /api/cards/:id/transactions. */
  enableDrilldown?: boolean
  /** When provided, the grid is in edit mode: each card shows a remove control. */
  onRemoveCard?: (cardId: string) => void
}) {
  const [drill, setDrill] = useState<EvaluatedCard | null>(null)
  const [rowDrill, setRowDrill] = useState<DrillLevel | null>(null)
  const { fetchWithWorkspace } = useWorkspace()
  const editing = Boolean(onRemoveCard)

  // Tap a rolled-up breakdown row → drawer of that category's transactions.
  const openRowDrill = useCallback(
    (card: EvaluatedCard, key: string, label: string) => {
      // Category group keys are "PRIMARY DETAILED"; the transactions endpoint
      // filters by the detailed category (the token after the space).
      const category = key.includes(' ') ? key.slice(key.indexOf(' ') + 1) : key
      setRowDrill({
        title: label,
        subtitle: 'Loading…',
        rows: [],
        emptyText: 'Loading…',
      })
      fetchWithWorkspace(
        `/api/cards/${encodeURIComponent(card.id)}/transactions?category=${encodeURIComponent(category)}&limit=50`,
      )
        .then((r) =>
          r.ok ? r.json() : Promise.reject(new Error('load failed')),
        )
        .then((body) => {
          const txns: MoneyTransactionRow[] = body.transactions ?? []
          setRowDrill({
            title: label,
            subtitle: `${(body.total ?? txns.length).toLocaleString()} transactions`,
            rows: txns.map(txToRow),
            emptyText: 'No transactions in this category.',
          })
        })
        .catch(() =>
          setRowDrill((cur) =>
            cur
              ? {
                  ...cur,
                  subtitle: 'Couldn’t load',
                  emptyText: 'Couldn’t load transactions.',
                }
              : null,
          ),
        )
    },
    [fetchWithWorkspace],
  )

  const cells: MasonryCell[] = cards.map((card, i) => {
    const renderer = (
      <DashboardCardCell
        card={card}
        index={i}
        editing={editing}
        enableDrilldown={enableDrilldown}
        onOpenTxns={() => setDrill(card)}
        onDrillRow={(key, label) => openRowDrill(card, key, label)}
      />
    )
    const { colSpan, rowSpan } = tileSize(card)
    return {
      key: `${card.id}-${i}`,
      colSpan,
      rowSpan,
      node: editing ? (
        <div className="relative h-full">
          {renderer}
          <button
            type="button"
            onClick={() => onRemoveCard?.(card.id)}
            aria-label={`Remove ${card.title} from this dashboard`}
            className={cn(
              'border-border bg-card text-muted-foreground hover:text-destructive absolute -right-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors',
              FOCUS_RING,
            )}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        renderer
      ),
    }
  })

  return (
    <>
      <MasonryGrid cells={cells} />
      <TransactionDrilldown card={drill} onClose={() => setDrill(null)} />
      <DrilldownDrawer root={rowDrill} onClose={() => setRowDrill(null)} />
    </>
  )
}
