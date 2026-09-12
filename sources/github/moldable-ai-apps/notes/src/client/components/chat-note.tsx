import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Markdown } from '@moldable-ai/ui'
import type { Note } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

export function ChatNote() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-note', selection],
    queryFn: () =>
      callCardApp<
        Pick<Note, 'id' | 'title' | 'content' | 'isDeleted'> & {
          truncated: boolean
        }
      >('notes', 'notes.cards.read'),
    refetchInterval: 30_000,
  })
  const note = query.data
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading note…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {note?.isDeleted ? (
        <p className="text-muted-foreground p-4 text-sm">
          This note was deleted.
        </p>
      ) : (
        note && (
          <>
            <div hidden={expanded}>
              <button
                type="button"
                className="border-border hover:bg-muted/40 focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
                onClick={() => {
                  setError(undefined)
                  void openQuickLook(note.id).catch((error) =>
                    setError(String(error)),
                  )
                }}
              >
                <h2 className="truncate text-sm font-medium">
                  {note.title || 'Untitled note'}
                </h2>
                <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                  {note.content.slice(0, 500).replace(/[#*_`>]/g, '')}
                </p>
              </button>
            </div>
            {expanded && (
              <article className="space-y-4 p-5">
                <h1 className="text-xl font-semibold">
                  {note.title || 'Untitled note'}
                </h1>
                <Markdown markdown={note.content} />
                {note.truncated && (
                  <p className="text-muted-foreground text-xs">
                    This long note continues in Notes.
                  </p>
                )}
              </article>
            )}
          </>
        )
      )}
    </div>
  )
}
