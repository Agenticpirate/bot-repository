import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface TableCard {
  title: string
  columns: string[]
  rows: string[][]
  hasMore: boolean
  totalColumns: number
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const query = useQuery({
    queryKey: [
      'chat-table',
      new URLSearchParams(location.search).get('cardInput'),
      expanded,
    ],
    queryFn: () =>
      callCardApp<TableCard>('db-browser', 'db-browser.cards.read', {
        detail: expanded,
      }),
    refetchInterval: 30_000,
  })
  const card = query.data
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading rows…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {card && (
        <div className="border-border relative rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-medium">{card.title}</h2>
          <div
            className={
              expanded ? 'overflow-auto' : 'pointer-events-none overflow-hidden'
            }
          >
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">{card.title} rows</caption>
              <thead>
                <tr>
                  {card.columns.map((column, index) => (
                    <th
                      key={index}
                      className="border-border max-w-48 truncate border-b px-2 py-2 font-medium"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className="border-border text-muted-foreground max-w-48 truncate border-b px-2 py-2 font-mono"
                        title={expanded ? cell : undefined}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!card.rows.length && (
            <p className="text-muted-foreground py-3 text-sm">No rows.</p>
          )}
          {expanded ? (
            <p className="text-muted-foreground mt-3 text-xs">
              {card.rows.length} rows
              {card.hasMore ? ' · More rows available in Database' : ''}
              {card.totalColumns > card.columns.length
                ? ` · ${card.columns.length} of ${card.totalColumns} columns`
                : ''}
              . Cell previews are limited to 80 characters; structured values
              open in Database.
            </p>
          ) : (
            <button
              type="button"
              aria-label={`Open ${card.title} rows`}
              className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook().catch((error) => setError(String(error)))
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
