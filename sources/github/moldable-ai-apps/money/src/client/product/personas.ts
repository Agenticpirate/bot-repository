/**
 * Job-flavored "best practices" dashboards. Each speaks to a thing the user
 * wants Money to help with and composes a curated set of the real card definitions
 * (`/api/cards/templates` ids) into a coherent view. These drive three things:
 *
 *  1. The onboarding "what should Money help with?" chooser.
 *  2. Provisioning real dashboards via `PATCH /api/dashboards/:id`.
 *  3. The Dashboards home tiles.
 *
 * Card ids here MUST match real definition ids from `/api/cards/templates`. The
 * renderer/drilldown stack degrades gracefully when a card has no data yet, so
 * an extension-dependent card (subscriptions, obligations) just shows an empty
 * state until labeling/sync fills it in.
 */

export interface PersonaDashboard {
  id: string
  /** Short dashboard name (host header shows it; we never render our own). */
  name: string
  /** The user job this dashboard supports. */
  audience: string
  /** Default emoji icon (same style as categories; user-overridable). */
  emoji: string
  /** Ordered real card definition ids. */
  cardIds: string[]
}

export const PERSONA_DASHBOARDS: PersonaDashboard[] = [
  {
    id: 'overview',
    name: 'Overview',
    audience: 'Know if I’m okay.',
    emoji: '🧭',
    cardIds: [
      'net-worth',
      'spend-change-vs-last-month',
      'monthly-cash-flow',
      'savings-health',
      'runway',
      'transaction-activity',
    ],
  },
  {
    id: 'cashflow',
    name: 'Spending Control',
    audience: 'Understand where my money is going.',
    emoji: '💸',
    cardIds: [
      'monthly-spend',
      'expense-trend',
      'expense-breakdown',
      'category-drift',
      'top-merchants',
      'monthly-merchant-spend',
      'largest-expenses',
      'income-sources',
    ],
  },
  {
    id: 'bills',
    name: 'Bills & Subscriptions',
    audience: 'Track recurring charges before they surprise me.',
    emoji: '🔁',
    cardIds: [
      'subscription-cost',
      'active-subscriptions',
      'upcoming-subscriptions',
      'upcoming-recurring-obligations',
      'recurring-spend-by-need',
      'credit-card-payment-volume',
    ],
  },
  {
    id: 'networth',
    name: 'Net Worth & Accounts',
    audience: 'Track accounts, wealth, and balances.',
    emoji: '🏦',
    cardIds: [
      'net-worth-trend',
      'liquid-vs-illiquid',
      'investments',
      'investment-allocation',
      'investment-trend',
    ],
  },
  {
    id: 'fire',
    name: 'FIRE / Freedom',
    audience: 'Build wealth and track financial independence.',
    emoji: '🔥',
    cardIds: [
      'financial-independence-projection',
      'tax-advantaged-contributions',
      'income-saved',
    ],
  },
  {
    id: 'debt',
    name: 'Debt & Obligations',
    audience: 'Pay down debt and avoid surprise obligations.',
    emoji: '💳',
    cardIds: [
      'debt-payoff-optimizer',
      'interest-drag',
      'high-apr-debts',
      'credit-utilization',
      'card-account-spend',
    ],
  },
]

export const PERSONA_BY_ID = Object.fromEntries(
  PERSONA_DASHBOARDS.map((p) => [p.id, p]),
) as Record<string, PersonaDashboard>
