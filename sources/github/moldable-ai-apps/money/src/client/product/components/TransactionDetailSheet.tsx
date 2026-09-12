import {
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import type { MoneyTransactionRow } from '../../ui-kit/lib/types'
import {
  type CategoryCatalogLike,
  categoryLabel,
  providerCategoryLabel,
} from '../lib/categories'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'

/**
 * Inspect a single transaction and (optionally) label it. Complements the
 * merchant-level Categorize: this is for one-off corrections and a closer look.
 */
export function TransactionDetailSheet({
  tx,
  categoryCatalog,
  onClose,
}: {
  tx: MoneyTransactionRow | null
  categoryCatalog?: CategoryCatalogLike
  onClose: () => void
}) {
  const open = tx !== null
  const cat = tx
    ? providerCategoryLabel(tx, categoryCatalog?.preferences)
    : undefined
  const displayCat = tx ? categoryLabel(tx, categoryCatalog) : undefined
  const sign =
    tx?.direction === 'income' ? '+' : tx?.direction === 'expense' ? '−' : ''
  const tone =
    tx?.direction === 'income'
      ? 'text-success'
      : tx?.direction === 'transfer'
        ? 'text-muted-foreground'
        : 'text-foreground'

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-border/60 gap-0 border-b px-5 py-4">
          <SheetTitle className="sr-only">Transaction detail</SheetTitle>
          {tx ? (
            <div className="flex items-center gap-3">
              <MerchantChip name={tx.merchantName || tx.name} size={40} />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">
                  {tx.merchantName || tx.name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDate(tx.date, { weekday: 'short' })}
                </div>
              </div>
            </div>
          ) : null}
        </SheetHeader>

        {tx ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div
              className={cn(
                'uk-nums text-3xl font-semibold tabular-nums tracking-tight',
                tone,
              )}
            >
              {sign}
              {formatMoney(Math.abs(tx.amount), {
                currency: tx.isoCurrencyCode,
                cents: true,
              })}
            </div>

            <dl className="space-y-2.5 text-sm">
              <Field label="Description" value={tx.name} wrap />
              {cat ? <Field label="Category" value={cat} /> : null}
              {tx.userCategory && displayCat ? (
                <Field label="Your category" value={displayCat} />
              ) : null}
              <Field label="Direction" value={cap(tx.direction)} />
              {tx.pending ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Pending
                    </Badge>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  value,
  wrap = false,
}: {
  label: string
  value: string
  wrap?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        title={value}
        className={cn(
          'min-w-0 text-right font-medium',
          wrap ? '[overflow-wrap:anywhere]' : 'truncate',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
