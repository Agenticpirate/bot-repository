import type { MoneyAccount } from './accounts'

/**
 * Small helpers for rendering accounts (used by the Accounts screen's manual
 * accounts list). Net-worth / liquid-illiquid / credit roll-ups are NOT computed
 * here anymore — those are formula-backed cards (`Accounts.Sum()`,
 * `CreditUtilization(...)`, `Accounts.Where(isAsset=true).GroupBy(...)`) so they
 * stay FX-normalized and inspectable, not hard-coded client sums.
 */

/** This account's native value (for per-row display in its own currency). */
export function nativeValue(a: MoneyAccount): number {
  return a.valueForSum ?? a.currentBalance ?? 0
}

/** The account's native currency (for per-row glyphs). */
export function accountCurrency(a: MoneyAccount): string {
  return a.isoCurrencyCode ?? 'USD'
}

/** FX-normalized value when the backend supplies it; else native (best effort). */
export function normalizedValue(a: MoneyAccount): number {
  return a.reportingValue ?? a.valueForSum ?? a.currentBalance ?? 0
}

/** A human label for an account's kind (used as a sublabel). */
export function assetKindLabel(a: MoneyAccount): string {
  if (a.type === 'cash') return cap(a.subtype) || 'Cash'
  if (a.investmentAccountKind) {
    const k = a.investmentAccountKind
    if (k === 'ira') return 'IRA'
    if (k === 'roth_ira') return 'Roth IRA'
    if (k === '401k') return '401(k)'
    return k.toUpperCase().length <= 4 ? k.toUpperCase() : cap(k)
  }
  if (a.source === 'manual') return cap(a.subtype) || cap(a.type) || 'Manual'
  return cap(a.subtype) || cap(a.type) || 'Other'
}

function cap(s?: string): string {
  if (!s) return ''
  return s
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
