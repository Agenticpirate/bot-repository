import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { usePodcastApi } from '../lib/api'
import { useCardSurface } from '../lib/chat-card-surface'
import type { EpisodeView } from '../../shared/podcast'
import { EpisodeNotes } from './episode-notes'
import { EpisodePlayer } from './episode-player'
import { GenerationQueueControl } from './generation-queue'

export function ChatCard() {
  const { contentRef, expanded } = useCardSurface(480)
  const { call, workspaceId } = usePodcastApi()
  const [queueOpen, setQueueOpen] = useState(false)
  const query = useQuery({
    queryKey: [
      'podcast-card',
      workspaceId,
      new URLSearchParams(location.search).get('cardInput'),
    ],
    queryFn: () => call<EpisodeView>('podcasts.cards.read'),
    refetchInterval: (query) =>
      ['queued', 'generating'].includes(query.state.data?.status ?? '')
        ? 2500
        : 30_000,
    refetchOnWindowFocus: true,
  })
  return (
    <div ref={contentRef} className="podcast-card">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-5 text-sm">
          Loading your episode…
        </p>
      )}
      {query.error && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {query.error.message}
        </p>
      )}
      {query.data && (
        <>
          <EpisodePlayer
            key={query.data.id}
            episode={query.data}
            compact
            statusControl={
              query.data.status !== 'ready' ||
              query.data.thumbnail?.status === 'failed' ? (
                <GenerationQueueControl
                  compact
                  open={queueOpen}
                  onOpenChange={setQueueOpen}
                  snapshot={{
                    items: [query.data],
                    activeCount: ['queued', 'generating'].includes(
                      query.data.status,
                    )
                      ? 1
                      : 0,
                  }}
                />
              ) : undefined
            }
          />
          {expanded && <EpisodeNotes episode={query.data} />}
        </>
      )}
    </div>
  )
}
