import { useQueryClient } from '@tanstack/react-query'
import { ListMusic, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useIsMoldableMobileWeb,
} from '@moldable-ai/ui'
import { usePodcastApi } from '../lib/api'
import type { EpisodeSummary } from '../../shared/podcast'
import { EpisodeCover } from './episode-cover'

export interface QueueSnapshot {
  items: EpisodeSummary[]
  activeCount: number
}

function stage(episode: EpisodeSummary): string {
  if (episode.status === 'queued') return 'Waiting in queue'
  if (episode.status === 'failed') return "Couldn't finish"
  if (episode.status === 'cancelled') return 'Cancelled'
  if (episode.thumbnail?.status === 'failed') return 'Artwork needs attention'
  if (episode.thumbnail?.status === 'generating') return 'Creating artwork'
  if (episode.creation && !episode.creation.scriptReady)
    return 'Writing your episode'
  return 'Creating audio'
}

function QueueItem({
  episode,
  onSelect,
}: {
  episode: EpisodeSummary
  onSelect?: (id: string) => void
}) {
  const { call } = usePodcastApi()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const active = episode.status === 'queued' || episode.status === 'generating'
  const artworkFailed =
    episode.status === 'ready' && episode.thumbnail?.status === 'failed'
  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await call(
        active
          ? 'podcasts.episodes.cancel'
          : artworkFailed
            ? 'podcasts.episodes.retryArtwork'
            : 'podcasts.episodes.retry',
        { id: episode.id, expectedRevision: episode.revision },
      )
      await queryClient.invalidateQueries()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Please try again.')
      await queryClient.invalidateQueries()
    } finally {
      setBusy(false)
    }
  }
  const writing = episode.creation && !episode.creation.scriptReady
  const total = writing ? episode.creation?.totalSections : episode.totalParts
  const completed = writing
    ? episode.creation?.completedSections
    : episode.completedParts
  return (
    <div className="queue-item">
      <div className="queue-item-heading">
        <EpisodeCover
          accent={episode.accent}
          small
          imagePath={episode.thumbnailPath}
        />
        <div className="min-w-0 flex-1">
          {onSelect ? (
            <button
              type="button"
              className="queue-episode-title"
              onClick={() => onSelect(episode.id)}
            >
              {episode.title}
            </button>
          ) : (
            <p className="queue-episode-title">{episode.title}</p>
          )}
          <p className="queue-stage">{stage(episode)}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 cursor-pointer"
          disabled={busy}
          onClick={() => void run()}
          aria-label={`${active ? 'Cancel generation' : artworkFailed ? 'Retry artwork' : 'Retry generation'} for ${episode.title}`}
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : active ? (
            'Cancel'
          ) : (
            'Retry'
          )}
        </Button>
      </div>
      {active && episode.thumbnail?.status !== 'generating' && (
        <progress
          className="queue-progress"
          max={total || 1}
          value={total ? (completed ?? 0) : undefined}
          aria-label={`${stage(episode)} progress`}
        />
      )}
      {(error || episode.error || artworkFailed) && (
        <p role="alert" className="queue-error">
          {error ?? episode.error?.message ?? episode.thumbnail?.error?.message}
        </p>
      )}
    </div>
  )
}

export function GenerationQueueControl({
  open,
  onOpenChange,
  snapshot,
  pending = false,
  error,
  onSelect,
  compact = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: QueueSnapshot
  pending?: boolean
  error?: string
  onSelect?: (id: string) => void
  compact?: boolean
}) {
  const mobile = useIsMoldableMobileWeb()
  const select = onSelect
    ? (id: string) => {
        onSelect(id)
        onOpenChange(false)
      }
    : undefined
  const content = (
    <>
      {error ? (
        <p role="alert" className="queue-empty">
          {error}
        </p>
      ) : pending ? (
        <p className="queue-empty" role="status">
          Loading queue…
        </p>
      ) : snapshot.items.length ? (
        <div className="queue-items">
          {snapshot.items.map((episode) => (
            <QueueItem key={episode.id} episode={episode} onSelect={select} />
          ))}
        </div>
      ) : (
        <p className="queue-empty">Nothing in progress.</p>
      )}
    </>
  )
  if (mobile && !compact)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="queue-dialog" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Queue</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'default'}
          className={
            compact
              ? 'card-queue-button cursor-pointer'
              : 'queue-button cursor-pointer'
          }
          aria-label={`Generation queue${snapshot.activeCount ? `, ${snapshot.activeCount} in progress` : ''}`}
        >
          {snapshot.activeCount ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ListMusic className="size-4" />
          )}
          <span>
            {compact
              ? snapshot.activeCount
                ? 'In progress'
                : 'Needs attention'
              : 'Queue'}
          </span>
          {!compact && snapshot.items.length > 0 && (
            <span className="queue-count">
              {snapshot.activeCount || snapshot.items.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="queue-popover" sideOffset={8}>
        <div className="queue-popover-heading">
          <h2>Queue</h2>
          {snapshot.activeCount > 0 && (
            <span>{snapshot.activeCount} in progress</span>
          )}
        </div>
        {content}
      </PopoverContent>
    </Popover>
  )
}
