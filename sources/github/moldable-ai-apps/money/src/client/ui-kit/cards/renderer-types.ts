import type { ReactNode } from 'react'
import type { DeltaSpec, EvaluatedCard } from '../lib/types'
import type { CardState } from './CardShell'
import { cardScope } from './cardScope'

export interface RendererProps {
  card: EvaluatedCard
  index?: number
  delta?: DeltaSpec
  state?: CardState
  onRetry?: () => void
  /** Optional header control (e.g. a drilldown trigger) rendered by CardShell. */
  action?: ReactNode
  /** Tap a rolled-up row (e.g. a breakdown category) to drill into its values. */
  onDrillRow?: (key: string, label: string) => void
  /**
   * Optional category-emoji resolver, supplied by the host app for category
   * breakdowns. Maps a row key → emoji (or '' for none). Kept out of the kit's
   * defaults so the kit stays portable; emoji are off unless provided.
   */
  categoryEmoji?: (key: string) => string
}

/** Shared CardShell props derived from a card (title, formula back, states). */
export function shellPropsFor(
  card: EvaluatedCard,
  index?: number,
  state?: CardState,
  onRetry?: () => void,
  action?: ReactNode,
) {
  // Surface the card's time scope as a header badge so a number is never shown
  // without saying *what range* it covers ("As of today", "Next 45 days",
  // "Outstanding"…). Trend cards carry their own range switcher, and rangeable
  // cards get an interactive range control (which shows the period) injected by
  // the dashboard — so we don't statically double-label either of those.
  const scope = cardScope(card)
  const kindBadge =
    scope.kind !== 'trend' && !scope.rangeable && scope.label
      ? scope.label
      : undefined
  return {
    title: card.title,
    formula: card.formula ?? card.primaryFormula,
    secondaryFormulas: card.secondaryFormulas,
    formulaExplain: card.description,
    kindBadge,
    index,
    state,
    onRetry,
    action,
  }
}

/** Sentiment of a series given polarity (inverse = spending, where down is good). */
export function seriesTone(
  values: number[],
  inverse = false,
): 'positive' | 'negative' | 'neutral' {
  if (values.length < 2) return 'neutral'
  const d = values[values.length - 1] - values[0]
  if (d === 0) return 'neutral'
  const up = d > 0
  const good = inverse ? !up : up
  return good ? 'positive' : 'negative'
}

export type { DeltaSpec }
