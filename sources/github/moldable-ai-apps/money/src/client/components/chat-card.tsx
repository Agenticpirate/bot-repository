import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { EvaluatedCard } from '../ui-kit/lib/types'
import { CardRenderer } from '../ui-kit/cards/CardRenderer'

interface MoneyCard {
  card: EvaluatedCard
  transactions?: {
    id: string
    name: string
    date: string
    amount: number
    currency: string
  }[]
  detailNote?: string
  transactionTotal?: number
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput')
  const preview = useQuery({
    queryKey: ['chat-money', input],
    queryFn: () => callCardApp<MoneyCard>('money', 'money.chat.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-money', input, 'detail'],
    queryFn: () =>
      callCardApp<MoneyCard>('money', 'money.chat.read', { detail: true }),
    enabled: expanded,
    refetchInterval: expanded ? 30_000 : false,
  })
  const card = preview.data?.card
  return (
    <div ref={contentRef} className="bg-background">
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading financial card…
        </p>
      )}
      {(error || preview.error || (expanded && detail.error)) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {card && (
        <>
          <div hidden={expanded} className="relative">
            <div inert className="pointer-events-none max-h-72 overflow-hidden">
              <CardRenderer card={card} />
            </div>
            <button
              type="button"
              aria-label={`View ${card.title}`}
              className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook(card.id).catch((error) =>
                  setError(String(error)),
                )
              }}
            />
          </div>
          {expanded && (
            <article className="space-y-5 p-4">
              <CardRenderer card={detail.data?.card ?? card} />
              {card.description && (
                <p className="text-muted-foreground text-sm">
                  {card.description}
                </p>
              )}
              {detail.isPending && (
                <p role="status" className="text-muted-foreground text-sm">
                  Loading breakdown…
                </p>
              )}
              {detail.data?.detailNote && (
                <p className="text-muted-foreground text-xs">
                  {detail.data.detailNote}
                </p>
              )}
              {Boolean(detail.data?.transactions?.length) && (
                <section>
                  <h2 className="mb-2 text-sm font-medium">Transactions</h2>
                  <ul className="divide-border divide-y">
                    {detail.data?.transactions?.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{transaction.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {transaction.date}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: transaction.currency || 'CAD',
                          }).format(transaction.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(detail.data?.transactionTotal ?? 0) >
                    (detail.data?.transactions?.length ?? 0) && (
                    <p className="text-muted-foreground text-xs">
                      Showing the first {detail.data?.transactions?.length} of{' '}
                      {detail.data?.transactionTotal} transactions.
                    </p>
                  )}
                </section>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
