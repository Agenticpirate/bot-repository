import type { CardKind, EvaluatedCard } from '../lib/types'
import { cardScope } from './cardScope'
import { describe, expect, it } from 'vitest'

function mk(
  formula: string,
  extra: Partial<EvaluatedCard> = {},
): EvaluatedCard {
  return {
    id: 'c',
    title: 'Card',
    kind: (extra.kind ?? 'metric') as CardKind,
    formula,
    format: 'currency',
    value: 0,
    displayValue: '$0',
    ...extra,
  }
}

describe('cardScope', () => {
  it('treats balance/account sums as point-in-time (no range)', () => {
    const s = cardScope(mk('Accounts.Sum()'))
    expect(s.kind).toBe('point')
    expect(s.label).toBe('As of today')
    expect(s.rangeable).toBe(false)
  })

  it('labels this-month flows and marks them rangeable', () => {
    const s = cardScope(
      mk('Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()'),
    )
    expect(s).toMatchObject({
      kind: 'window',
      label: 'This month',
      period: '1M',
      rangeable: true,
    })
  })

  it('labels rolling windows by months', () => {
    expect(
      cardScope(mk('Expenses.Rolling(6mo).GroupBy(category).PercentOfTotal()')),
    ).toMatchObject({
      kind: 'window',
      label: 'Last 6 months',
      period: '6M',
      rangeable: true,
    })
    expect(cardScope(mk('Expenses.Rolling(3mo).Sum()')).label).toBe(
      'Last 3 months',
    )
    expect(cardScope(mk('Expenses.Rolling(1y).Sum()')).label).toBe(
      'Last 12 months',
    )
  })

  it('labels YTD and this-year', () => {
    expect(cardScope(mk('TaxContributions.YTD().Sum()'))).toMatchObject({
      label: 'Year to date',
      period: 'YTD',
    })
    expect(cardScope(mk('Expenses.ThisYear().Sum()'))).toMatchObject({
      label: 'This year',
      period: '1Y',
    })
  })

  it('treats trends as rangeable series', () => {
    expect(
      cardScope(mk('NetWorthHistory.Monthly().Trend()', { kind: 'trend' })),
    ).toMatchObject({
      kind: 'trend',
      rangeable: true,
    })
    // Also detected from the formula even if kind is generic.
    expect(
      cardScope(mk('Expenses.Monthly().Trend().MovingAverage(3)')).kind,
    ).toBe('trend')
  })

  it('labels forward-looking cards by horizon, not range', () => {
    expect(
      cardScope(mk('RecurringObligations.DueSoon(45d).Unique(key).Sum()')),
    ).toMatchObject({
      kind: 'forecast',
      label: 'Next 45 days',
      rangeable: false,
    })
    expect(
      cardScope(
        mk('Runway(Cash.Sum(), Expenses.MonthlyAverage(6))', {
          kind: 'forecast',
        }),
      ),
    ).toMatchObject({
      kind: 'forecast',
      rangeable: false,
    })
  })

  it('flags silently-all-time flow cards honestly', () => {
    const s = cardScope(
      mk('Transactions.GroupBy(direction).PercentOfTotal()', {
        referencedCollections: ['Transactions'],
      }),
    )
    expect(s).toMatchObject({
      kind: 'window',
      label: 'All time',
      period: 'ALL',
      rangeable: true,
    })
  })

  it('treats outstanding/review sets as open, not windowed', () => {
    expect(
      cardScope(mk('ReviewActions.Where(status = "required").Count()')).kind,
    ).toBe('open')
    expect(
      cardScope(mk('SharedExpenses.Where(status = "owed").Sum()')),
    ).toMatchObject({
      kind: 'open',
      label: 'Outstanding',
    })
  })

  it('prefers a backend-supplied scope when present', () => {
    const s = cardScope(
      mk('Accounts.Sum()', {
        scope: {
          kind: 'window',
          label: 'Last 30 days',
          period: '1M',
          rangeable: true,
        },
      }),
    )
    expect(s).toMatchObject({
      kind: 'window',
      label: 'Last 30 days',
      rangeable: true,
    })
  })
})
