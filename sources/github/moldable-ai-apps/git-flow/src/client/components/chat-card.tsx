import { useQuery } from '@tanstack/react-query'
import { GitBranch } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface GitCard {
  title: string
  branch: string
  changedFiles: number
  files: { path: string; status: string }[]
  diff?: string
  truncated: boolean
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const query = useQuery({
    queryKey: [
      'chat-git',
      new URLSearchParams(location.search).get('cardInput'),
      expanded,
    ],
    queryFn: () =>
      callCardApp<GitCard>('git-flow', 'git-flow.cards.read', {
        detail: expanded,
      }),
    refetchInterval: 30_000,
  })
  const card = query.data
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading changes…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {card && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook().catch((error) => setError(String(error)))
              }}
            >
              <h2 className="truncate text-sm font-medium">{card.title}</h2>
              <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                <GitBranch className="size-3" />
                {card.branch} · {card.changedFiles} changed files
              </p>
              {card.files.slice(0, 3).map((file) => (
                <p
                  key={file.path}
                  className="text-muted-foreground mt-2 truncate font-mono text-xs"
                >
                  {file.status} {file.path}
                </p>
              ))}
            </button>
          </div>
          {expanded && (
            <article className="space-y-4 p-4">
              <h1 className="break-all text-lg font-semibold">{card.title}</h1>
              <p className="text-muted-foreground text-xs">
                {card.branch} · {card.changedFiles} changed files
              </p>
              {card.diff ? (
                <pre className="bg-muted overflow-auto rounded-lg p-3 text-xs leading-relaxed">
                  <code>
                    {card.diff.split('\n').map((line, index) => (
                      <span
                        key={index}
                        className={
                          line.startsWith('+')
                            ? 'text-success'
                            : line.startsWith('-')
                              ? 'text-destructive'
                              : undefined
                        }
                      >
                        {line}
                        {'\n'}
                      </span>
                    ))}
                  </code>
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No tracked changes in this selection.
                </p>
              )}
              {card.truncated && (
                <p className="text-muted-foreground text-xs">
                  Showing the first 40,000 characters. The complete diff
                  continues in Git.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
