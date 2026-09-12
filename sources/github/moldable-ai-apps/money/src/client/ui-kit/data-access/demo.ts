/**
 * Curated demo data for the /ui-kit surface. ONE coherent persona's finances
 * power four themed example dashboards. This is *local visual breadth only* —
 * it is never POSTed to the backend and never mixes with live facts.
 *
 * Every object mirrors the backend `EvaluatedCard` shape so the same renderers
 * drive both demo and live data.
 */
import type {
  DashboardCard,
  EvaluatedCard,
  FormulaEntityListValue,
  FormulaResultValue,
  FormulaSeriesValue,
  FormulaTableValue,
  MoneyValueFormat,
} from '../lib/types'

/* --------------------------------------------------------------- builders */

const MONTHS = [
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
]

function series(
  values: number[],
  labels: string[] = MONTHS,
): FormulaSeriesValue {
  const offset = labels.length - values.length
  return {
    type: 'series',
    points: values.map((value, i) => ({
      key: String(i),
      label: labels[offset + i] ?? String(i),
      value,
      count: 1,
    })),
  }
}

function table(
  rows: Array<{ label: string; value: number; percent?: number }>,
): FormulaTableValue {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  return {
    type: 'table',
    columns: [
      { key: 'label', label: 'Category', kind: 'string' },
      { key: 'value', label: 'Amount', kind: 'number' },
      { key: 'percentOfTotal', label: 'Percent', kind: 'percent' },
    ],
    rows: rows.map((r) => ({
      key: r.label,
      label: r.label,
      value: r.value,
      percentOfTotal: r.percent ?? r.value / total,
    })),
  }
}

interface DemoEntity {
  label: string
  value: number
  subtitle?: string
  apr?: number
}
function entities(list: DemoEntity[]): FormulaEntityListValue {
  return {
    type: 'entity-list',
    entities: list.map((e, i) => {
      const fields: Record<string, string | number | boolean | null> = {}
      if (e.apr !== undefined) fields.apr = e.apr
      return {
        id: `demo-${i}-${e.label}`,
        label: e.label,
        value: e.value,
        kind: 'transaction' as const,
        subtitle: e.subtitle,
        fields,
      }
    }),
  }
}

interface CardInput {
  id: string
  title: string
  kind: EvaluatedCard['kind']
  format: MoneyValueFormat
  value: FormulaResultValue
  displayValue?: string
  formula: string
  secondaryFormulas?: Record<string, string>
  secondaryValues?: Record<string, FormulaResultValue>
  description?: string
  visualization?: string
}
function card(input: CardInput): EvaluatedCard {
  return {
    ...input,
    displayValue: input.displayValue ?? '',
  }
}

/* ---------------------------------------------------------------- persona */
// Coherent figures: net worth ≈ assets − liabilities, savings rate ties to
// income/expenses, runway ties to cash & burn.

const netWorthTrend = [
  185_200, 188_400, 187_100, 191_800, 195_300, 193_900, 198_700, 201_200,
  199_800, 204_100, 206_700, 207_412,
]
const savingsRateTrend = [
  0.03, 0.05, 0.08, 0.07, 0.11, 0.13, 0.12, 0.16, 0.18, 0.17, 0.2, 0.22,
]
const cashFlowTrend = [
  -450, 900, 1_300, 700, 2_200, 2_700, 2_500, 3_200, 3_700, 3_500, 4_300, 4_918,
]
const subscriptionTrend = [
  284, 291, 305, 312, 318, 372, 360, 388, 401, 372, 358, 372,
]
const incomeTrend = [
  9_900, 10_100, 10_050, 10_400, 10_900, 11_200, 11_050, 11_600, 12_100, 11_900,
  12_400, 12_480,
]

export const DEMO_CARDS = {
  netWorth: card({
    id: 'net-worth',
    title: 'Net Worth',
    kind: 'metric',
    format: 'currency',
    value: 207_412,
    formula: 'Accounts.Sum()',
    secondaryFormulas: {
      trend: 'Accounts.Rolling(1y).Monthly().Trend()',
      assets: 'Assets.Sum()',
      liabilities: 'Liabilities.Sum()',
    },
    secondaryValues: { trend: series(netWorthTrend) },
    description:
      'Everything you own minus everything you owe, across all linked accounts.',
  }),
  netWorthTrend: card({
    id: 'net-worth-trend',
    title: 'Net Worth',
    kind: 'trend',
    format: 'currency',
    value: series(netWorthTrend),
    formula: 'Accounts.Rolling(1y).Monthly().Trend()',
    description: 'Net worth over the trailing twelve months.',
  }),
  incomeSaved: card({
    id: 'income-saved',
    title: '% Income Saved',
    kind: 'ratio',
    format: 'percent',
    value: series(savingsRateTrend),
    formula:
      '(Income.Monthly().Sum() - Expenses.Monthly().Sum()) / Income.Monthly().Sum()',
    secondaryFormulas: {
      income: 'Income.ThisMonth().Sum()',
      expenses: 'Expenses.ThisMonth().Sum()',
    },
    description:
      'Share of take-home income you kept each month — climbing from 3% to 22%.',
  }),
  monthlyCashFlow: card({
    id: 'monthly-cash-flow',
    title: 'Monthly Cash Flow',
    kind: 'metric',
    format: 'currency',
    value: 4_918,
    formula: 'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
    secondaryFormulas: { trend: 'CashFlow.Rolling(1y).Monthly().Trend()' },
    secondaryValues: { trend: series(cashFlowTrend) },
    description: 'What you brought in minus what you spent this month.',
  }),
  monthlySpend: card({
    id: 'monthly-spend',
    title: 'Monthly Spend',
    kind: 'metric',
    format: 'currency',
    value: 7_562,
    formula: 'Expenses.ThisMonth().Sum()',
    secondaryFormulas: {
      previousMonth: 'Expenses.LastMonth().Sum()',
      rollingAverage: 'Expenses.MonthlyAverage(6)',
    },
    secondaryValues: { previousMonth: 8_104, rollingAverage: 7_920 },
    description: 'Current-month spending, excluding transfers.',
  }),
  spendChange: card({
    id: 'spend-change-vs-last-month',
    title: 'Spend Change',
    kind: 'comparison',
    format: 'percent',
    value: -0.067,
    formula: 'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.LastMonth().Sum())',
    secondaryFormulas: {
      currentMonth: 'Expenses.ThisMonth().Sum()',
      previousMonth: 'Expenses.LastMonth().Sum()',
    },
    secondaryValues: { currentMonth: 7_562, previousMonth: 8_104 },
    description: 'How this month’s spend compares with last month.',
  }),
  cashFlowTrend: card({
    id: 'cash-flow-trend',
    title: 'Monthly Cash Flow',
    kind: 'trend',
    format: 'currency',
    value: series(cashFlowTrend),
    formula: 'CashFlow.Rolling(1y).Monthly().Trend()',
    description: 'Net cash flow per month over the last year.',
  }),
  expenseTrend: card({
    id: 'expense-trend',
    title: 'Expense Trend',
    kind: 'trend',
    format: 'currency',
    value: series([8_240, 7_980, 8_430, 7_710, 8_104, 7_562]),
    formula: 'Expenses.Monthly().Trend().MovingAverage(3)',
    description: 'Monthly spending trend with a short moving average.',
  }),
  runway: card({
    id: 'runway',
    title: 'Runway',
    kind: 'forecast',
    format: 'duration',
    value: { type: 'duration', amount: 4, unit: 'year', days: 1_564 },
    formula: 'Runway(Cash.Sum(), Expenses.MonthlyAverage(6))',
    secondaryFormulas: {
      cash: 'Cash.Sum()',
      burn: 'Expenses.MonthlyAverage(6)',
    },
    description:
      'How long your cash lasts at your current average burn, with no new income.',
  }),
  freedomAge: card({
    id: 'financial-independence-projection',
    title: 'Freedom Age',
    kind: 'forecast',
    format: 'number',
    value: 42,
    formula: 'FreedomAge(Assets.Sum() / Expenses.MonthlyAverage(6))',
    secondaryFormulas: {
      monthsCovered: 'Assets.Sum() / Expenses.MonthlyAverage(6)',
    },
    description:
      'Projected age of financial independence at your current savings rate.',
  }),
  subscriptions: card({
    id: 'active-subscriptions',
    title: 'Active Subscriptions',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Uber Eats', value: 320, subtitle: 'Food delivery' },
      { label: 'Amazon', value: 293, subtitle: 'Shopping' },
      { label: 'Disney+', value: 25, subtitle: 'Streaming' },
      { label: 'Netflix', value: 22, subtitle: 'Streaming' },
      { label: 'Starbucks', value: 14, subtitle: 'Coffee' },
      { label: 'Spotify', value: 12, subtitle: 'Music' },
      { label: 'iCloud+', value: 3, subtitle: 'Storage' },
    ]),
    formula: 'Subscriptions.ThisMonth().Top(10)',
    secondaryFormulas: {
      count: 'Subscriptions.ThisMonth().Unique(subscriptionKey).Count()',
      total: 'Subscriptions.ThisMonth().Sum()',
    },
    description: 'Recurring merchants detected this month, by monthly spend.',
  }),
  subscriptionCost: card({
    id: 'subscription-cost',
    title: 'Subscription Cost',
    kind: 'metric',
    format: 'currency',
    value: 689,
    formula: 'Subscriptions.ThisMonth().Sum()',
    secondaryFormulas: { trend: 'Subscriptions.Rolling(1y).Monthly().Trend()' },
    secondaryValues: { trend: series(subscriptionTrend) },
    description: 'Total recurring-merchant spend this month.',
  }),
  upcomingSubscriptions: card({
    id: 'upcoming-subscriptions',
    title: 'Upcoming Subscriptions',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Spotify', value: 12, subtitle: 'Due Jun 21' },
      { label: 'Netflix', value: 22, subtitle: 'Due Jun 24' },
      { label: 'iCloud+', value: 3, subtitle: 'Due Jun 26' },
      { label: 'Disney+', value: 25, subtitle: 'Due Jul 2' },
    ]),
    formula:
      'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Top(5, nextDueDate)',
    secondaryFormulas: {
      total: 'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Sum()',
    },
    secondaryValues: { total: 62 },
    description: 'Detected recurring charges likely to renew soon.',
  }),
  investments: card({
    id: 'investments',
    title: 'Investments',
    kind: 'metric',
    format: 'currency',
    value: 111_921,
    formula: 'Investments.Sum()',
    secondaryFormulas: {
      allocation: 'Investments.GroupBy(assetClass).PercentOfTotal()',
    },
    description: '90% stocks, 10% crypto across brokerage and retirement.',
  }),
  investmentTrend: card({
    id: 'investment-trend',
    title: 'Investment Trend',
    kind: 'trend',
    format: 'currency',
    value: series([96_400, 98_200, 101_700, 105_900, 108_600, 111_921]),
    formula: 'InvestmentHistory.Monthly().Trend()',
    description: 'Investment balance trend from account and holding snapshots.',
  }),
  allocation: card({
    id: 'allocation',
    title: 'Investment Allocation',
    kind: 'breakdown',
    format: 'currency',
    value: table([
      { label: 'US Stocks', value: 64_914 },
      { label: 'Intl Stocks', value: 20_146 },
      { label: 'Bonds', value: 8_954 },
      { label: 'Crypto', value: 11_192 },
      { label: 'Cash', value: 6_715 },
    ]),
    formula: 'Investments.GroupBy(assetClass).PercentOfTotal()',
    description: 'Portfolio mix by asset class.',
  }),
  expenseBreakdown: card({
    id: 'expense-breakdown',
    title: 'Expense Breakdown',
    kind: 'breakdown',
    format: 'currency',
    value: table([
      { label: 'Housing', value: 2_650 },
      { label: 'Food & Drink', value: 1_180 },
      { label: 'Transport', value: 620 },
      { label: 'Shopping', value: 540 },
      { label: 'Subscriptions', value: 689 },
      { label: 'Travel', value: 410 },
      { label: 'Health', value: 280 },
      { label: 'Other', value: 360 },
    ]),
    formula: 'Expenses.ThisMonth().GroupBy(category).PercentOfTotal()',
    description: 'This month’s spending by category.',
  }),
  categoryDrift: card({
    id: 'category-drift',
    title: 'Category Drift',
    kind: 'comparison',
    format: 'number',
    value: table([
      { label: 'Food & Drink', value: 0.07 },
      { label: 'Shopping', value: -0.04 },
      { label: 'Travel', value: 0.03 },
      { label: 'Transport', value: -0.02 },
    ]),
    formula:
      'TableChange(Expenses.ThisMonth().GroupBy(category).PercentOfTotal(), Expenses.LastMonth().GroupBy(category).PercentOfTotal())',
    description:
      'Which categories are taking a larger or smaller share than last month.',
  }),
  topMerchants: card({
    id: 'top-merchants',
    title: 'Top Merchants',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Whole Foods', value: 842, subtitle: 'Groceries' },
      { label: 'Amazon', value: 611, subtitle: 'Shopping' },
      { label: 'Uber', value: 326, subtitle: 'Transportation' },
      { label: 'Delta Air Lines', value: 412, subtitle: 'Travel' },
      { label: 'Equinox', value: 168, subtitle: 'Health' },
    ]),
    formula: 'Merchants.Rolling(6mo).Top(5, expenses)',
    description: 'Canonical merchant rollup across recent spending.',
  }),
  monthlyMerchantSpend: card({
    id: 'monthly-merchant-spend',
    title: 'Monthly Merchant Spend',
    kind: 'breakdown',
    format: 'currency',
    value: table([
      { label: 'Whole Foods', value: 842 },
      { label: 'Amazon', value: 611 },
      { label: 'Uber', value: 326 },
      { label: 'Netflix', value: 22 },
    ]),
    formula: 'Expenses.ThisMonth().GroupBy(merchantId).PercentOfTotal()',
    description: 'This month’s spend grouped by merchant.',
  }),
  largestExpenses: card({
    id: 'largest-expenses',
    title: 'Largest Expenses',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Brooklyn Rent', value: 2_650, subtitle: 'Jun 1' },
      { label: 'Delta Air Lines', value: 412, subtitle: 'Jun 9' },
      { label: 'Whole Foods', value: 286, subtitle: 'Jun 12' },
      { label: 'Con Edison', value: 184, subtitle: 'Jun 5' },
      { label: 'Equinox', value: 168, subtitle: 'Jun 2' },
    ]),
    formula: 'Expenses.ThisMonth().Sort(amount, "desc").Top(5)',
    description: 'Your five biggest transactions this month.',
  }),
  savingsHealth: card({
    id: 'savings-health',
    title: 'Savings Health',
    kind: 'status',
    format: 'percent',
    value: 0.22,
    formula:
      'SavingsRate(Income.ThisMonth().Sum(), Expenses.ThisMonth().Sum())',
    secondaryFormulas: {
      cashFlow: 'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
      target: 'Income.ThisMonth().Sum() * 0.2',
    },
    secondaryValues: { cashFlow: 4_918, target: 2_496 },
    description: 'Your savings rate against a healthy 20% target.',
  }),
  reviewStatus: card({
    id: 'transaction-review-status',
    title: 'Review Queue',
    kind: 'status',
    format: 'number',
    value: 23,
    formula: 'ReviewActions.Where(status = "required").Count()',
    secondaryFormulas: {
      required: 'ReviewActions.Where(status = "required").Count()',
      suggestions: 'ReviewActions.Where(status = "suggested").Count()',
      done: 'ReviewActions.Where(status = "done").Count()',
    },
    secondaryValues: { required: 3, suggestions: 6, done: 14 },
    description: 'Transactions waiting on your review, with rule suggestions.',
  }),
  debtPayoff: card({
    id: 'debt-payoff-optimizer',
    title: 'Debt Payoff Optimizer',
    kind: 'optimizer',
    format: 'currency',
    value: 11_842,
    displayValue: '$11,842',
    formula: 'DebtPayoff(Debt.Where(balance > 0))',
    visualization: 'Avalanche',
    secondaryFormulas: {
      priority: 'Debt.Sort(apr, "desc")',
      monthlyInterest: 'Debt.InterestThisMonth().Sum()',
    },
    secondaryValues: {
      priority: entities([
        { label: 'Chase Sapphire', value: 4_291, apr: 0.224 },
        { label: 'Amex Gold', value: 1_840, apr: 0.198 },
        { label: 'Student Loan', value: 5_711, apr: 0.054 },
      ]),
    },
    description: 'Total balance and the avalanche order — highest APR first.',
  }),
  creditUtilization: card({
    id: 'credit-utilization',
    title: 'Credit Utilization',
    kind: 'metric',
    format: 'percent',
    value: 0.31,
    formula: 'Debt.Where(type = "credit").Sum() / CreditLimits.Sum()',
    secondaryFormulas: { trend: 'Utilization.Rolling(1y).Monthly().Trend()' },
    secondaryValues: {
      trend: series([
        0.52, 0.49, 0.47, 0.44, 0.41, 0.43, 0.39, 0.36, 0.34, 0.33, 0.32, 0.31,
      ]),
    },
    description:
      'Revolving balance as a share of total credit limit (under 30% is healthy).',
  }),
  cardAccountSpend: card({
    id: 'card-account-spend',
    title: 'Card Account Spend',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Chase Sapphire', value: 4_291, subtitle: '42% utilized' },
      { label: 'Amex Gold', value: 1_840, subtitle: '18% utilized' },
      { label: 'Apple Card', value: 620, subtitle: '9% utilized' },
    ]),
    formula: 'CardAccounts.Top(5, balance)',
    description: 'Credit and card account balances ranked by current balance.',
  }),
  interestDrag: card({
    id: 'interest-drag',
    title: 'Interest Drag',
    kind: 'metric',
    format: 'currency',
    value: 1_384,
    formula: 'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
    secondaryFormulas: {
      monthly: 'InterestDrag(Debt.Where(balance > 0 and apr > 0), "monthly")',
    },
    secondaryValues: { monthly: 115 },
    description: 'Estimated annual interest cost from open debts.',
  }),
  highAprDebts: card({
    id: 'high-apr-debts',
    title: 'High APR Debts',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Chase Sapphire', value: 4_291, subtitle: '22.4% APR' },
      { label: 'Amex Gold', value: 1_840, subtitle: '19.8% APR' },
      { label: 'Student Loan', value: 5_711, subtitle: '5.4% APR' },
    ]),
    formula: 'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
    description: 'Highest APR debts to prioritize first.',
  }),
  recurringByNeed: card({
    id: 'recurring-spend-by-need',
    title: 'Recurring Spend By Need',
    kind: 'comparison',
    format: 'currency',
    value: 4_609,
    formula: 'Expenses.ThisMonth().Where(recurring = true).Sum()',
    secondaryFormulas: {
      essentials: 'Expenses.ThisMonth().Where(need = "required").Sum()',
      lifestyleCreep:
        'Expenses.ThisMonth().Where(need = "discretionary").Sum()',
    },
    secondaryValues: { essentials: 4_291, lifestyleCreep: 318 },
    description: 'Required recurring bills vs discretionary "lifestyle creep".',
  }),
  taxAdvantaged: card({
    id: 'tax-advantaged-contributions',
    title: 'Tax-Advantaged Contributions',
    kind: 'comparison',
    format: 'currency',
    value: 20_500,
    formula: 'TaxSheltered.ThisYear().Sum()',
    secondaryFormulas: {
      sheltered: 'TaxSheltered.ThisYear().Sum()',
      unsheltered:
        'Investments.Contributions().ThisYear().Sum() - TaxSheltered.ThisYear().Sum()',
    },
    secondaryValues: { sheltered: 20_500, unsheltered: 6_000 },
    description: 'Retirement/HSA contributions vs taxable investing this year.',
  }),
  joyReviewed: card({
    id: 'joy-reviewed-spend',
    title: 'Joy-Reviewed Spend',
    kind: 'comparison',
    format: 'currency',
    value: 5_290,
    formula: 'JoyReview.ThisMonth().Sum()',
    secondaryFormulas: {
      sparksJoy: 'JoyReview.Where(rating = "positive").Sum()',
      regret: 'JoyReview.Where(rating = "negative").Sum()',
    },
    secondaryValues: { sparksJoy: 4_918, regret: 372 },
    description: 'Spending you marked as worth it vs spending you regret.',
  }),
  incomeSources: card({
    id: 'income-sources',
    title: 'Income Sources',
    kind: 'trend',
    format: 'currency',
    value: series(incomeTrend),
    formula: 'Income.Rolling(1y).Monthly().Trend()',
    secondaryFormulas: {
      monthlyAverage: 'Income.MonthlyAverage(6)',
      sources: 'Income.Unique(source).Count()',
    },
    description: 'Monthly income over the last year across all sources.',
  }),
  upcomingObligations: card({
    id: 'upcoming-recurring-obligations',
    title: 'Upcoming Obligations',
    kind: 'forecast',
    format: 'currency',
    value: 1_918,
    formula: 'RecurringObligations.DueSoon().Sum()',
    secondaryFormulas: {
      largestSurprises: 'RecurringObligations.DueSoon().Top(5)',
    },
    secondaryValues: {
      largestSurprises: entities([
        { label: 'Auto Insurance', value: 642, subtitle: 'Due Jun 18' },
        { label: 'AWS', value: 488, subtitle: 'Due Jun 21' },
        { label: 'Property Tax', value: 410, subtitle: 'Due Jun 30' },
      ]),
    },
    description:
      'Non-monthly bills likely due in the next six weeks — keep this in checking.',
  }),
  sharedExpenses: card({
    id: 'shared-expense-reimbursements',
    title: 'Reimbursements Owed',
    kind: 'entity-list',
    format: 'currency',
    value: entities([
      { label: 'Alex', value: 372, subtitle: 'Trip · owed to you' },
      { label: 'Jordan', value: 148, subtitle: 'Dinner · owed to you' },
      { label: 'Sam', value: 96, subtitle: 'Groceries · paid' },
    ]),
    formula: 'SharedExpenses.Where(status = "owed").GroupBy(person)',
    secondaryFormulas: { owed: 'SharedExpenses.Where(status = "owed").Sum()' },
    description: 'Who owes you, and how much is still outstanding.',
  }),
} satisfies Record<string, EvaluatedCard>

/* ------------------------------------------------------------ dashboards */

export interface DemoDashboard {
  id: string
  name: string
  description: string
  cards: DashboardCard[]
}

const D = DEMO_CARDS

export const DEMO_DASHBOARDS: DemoDashboard[] = [
  {
    id: 'overview',
    name: 'Overview',
    description:
      'The at-a-glance picture: what changed, whether cash flow is healthy, and what needs attention.',
    cards: [
      { card: D.netWorth, span: 1 },
      { card: D.spendChange, span: 1 },
      {
        card: D.monthlyCashFlow,
        span: 1,
        delta: { value: 540, caption: 'vs last month' },
      },
      { card: D.savingsHealth, span: 1 },
      {
        card: D.runway,
        span: 1,
        delta: { value: 27, label: '27 days', caption: 'vs last month' },
      },
      { card: D.reviewStatus, span: 1 },
    ],
  },
  {
    id: 'cashflow',
    name: 'Spending Control',
    description:
      'A daily driver for spend trends, category drift, merchants, and large transactions.',
    cards: [
      { card: D.monthlySpend, span: 1 },
      { card: D.spendChange, span: 1 },
      { card: D.expenseTrend, span: 2 },
      { card: D.expenseBreakdown, span: 2 },
      { card: D.categoryDrift, span: 2 },
      { card: D.topMerchants, span: 2 },
      { card: D.monthlyMerchantSpend, span: 2 },
      { card: D.largestExpenses, span: 2 },
      { card: D.incomeSources, span: 2 },
    ],
  },
  {
    id: 'bills',
    name: 'Bills & Subscriptions',
    description:
      'Recurring charges, upcoming renewals, and obligations that need cash set aside.',
    cards: [
      { card: D.subscriptionCost, span: 1 },
      { card: D.subscriptions, span: 2 },
      { card: D.upcomingSubscriptions, span: 2 },
      { card: D.upcomingObligations, span: 1 },
      { card: D.recurringByNeed, span: 1 },
    ],
  },
  {
    id: 'networth',
    name: 'Net Worth & Accounts',
    description:
      'Balances, liquidity, investments, card utilization, and the trend over time.',
    cards: [
      { card: D.netWorthTrend, span: 2 },
      {
        card: D.investments,
        span: 1,
        delta: { value: 1_840, caption: 'this month' },
      },
      { card: D.investmentTrend, span: 2 },
      { card: D.allocation, span: 2 },
    ],
  },
  {
    id: 'fire',
    name: 'FIRE / Freedom',
    description:
      'Tracking the path to financial independence and early retirement.',
    cards: [
      {
        card: D.freedomAge,
        span: 1,
        delta: { value: 17, label: '17 days', caption: 'sooner' },
      },
      { card: D.taxAdvantaged, span: 2 },
      { card: D.incomeSaved, span: 2 },
    ],
  },
  {
    id: 'debt',
    name: 'Debt & Obligations',
    description:
      'Payoff strategy, utilization, and the bills that sneak up on you.',
    cards: [
      { card: D.debtPayoff, span: 2 },
      { card: D.interestDrag, span: 1 },
      { card: D.highAprDebts, span: 2 },
      { card: D.creditUtilization, span: 1 },
      { card: D.cardAccountSpend, span: 2 },
    ],
  },
]

/** A representative card of every renderer kind, for the component gallery. */
export const GALLERY_CARDS: EvaluatedCard[] = [
  // span-2 kinds first, then span-1, so the catalog tiles into flush rows.
  D.netWorthTrend,
  D.expenseBreakdown,
  D.debtPayoff,
  D.recurringByNeed,
  D.netWorth,
  D.savingsHealth,
  D.subscriptions,
  D.runway,
  D.reviewStatus,
  D.freedomAge,
  D.investments,
  D.monthlyCashFlow,
]
