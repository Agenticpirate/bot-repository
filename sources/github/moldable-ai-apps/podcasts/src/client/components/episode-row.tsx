import { useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moldable-ai/ui'
import { usePodcastApi } from '../lib/api'
import { type EpisodeSummary, formatTime } from '../../shared/podcast'
import { EpisodeCover } from './episode-cover'

export function EpisodeRow({
  episode,
  selected,
  onSelect,
  onDeleted,
}: {
  episode: EpisodeSummary
  selected: boolean
  onSelect: (id: string) => void
  onDeleted?: (id: string) => void
}) {
  const { call } = usePodcastApi()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const retryAudio =
    episode.status === 'failed' || episode.status === 'cancelled'
  const retryArtwork =
    episode.status === 'ready' && episode.thumbnail?.status === 'failed'
  const run = async (method: string, params: Record<string, unknown> = {}) => {
    setBusy(true)
    setError(undefined)
    try {
      await call(method, {
        id: episode.id,
        expectedRevision: episode.revision,
        ...params,
      })
      if (method === 'podcasts.episodes.delete') {
        setDeleteOpen(false)
        onDeleted?.(episode.id)
      }
      await queryClient.invalidateQueries()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Please try again.')
      await queryClient.invalidateQueries()
    } finally {
      setBusy(false)
    }
  }
  const status =
    episode.status === 'ready' || episode.completedParts > 0
      ? formatTime(episode.durationSeconds)
      : episode.status === 'queued'
        ? 'Queued'
        : episode.status === 'generating'
          ? 'In progress'
          : episode.status === 'failed'
            ? 'Needs attention'
            : 'Cancelled'
  return (
    <div className={`episode-row ${selected ? 'episode-row-active' : ''}`}>
      <button
        type="button"
        className="episode-row-select"
        onClick={() => onSelect(episode.id)}
        aria-label={`Open episode: ${episode.title}`}
        aria-current={selected ? 'true' : undefined}
      >
        <EpisodeCover
          accent={episode.accent}
          small
          imagePath={episode.thumbnailPath}
        />
        <div className="episode-row-copy">
          <h3>{episode.title}</h3>
          <p>{episode.description}</p>
        </div>
        <span className="episode-duration">{status}</span>
      </button>
      <div className="episode-row-actions">
        {(retryAudio || retryArtwork) && (
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            disabled={busy}
            aria-label={`Retry ${retryArtwork ? 'artwork' : 'generation'} for ${episode.title}`}
            title={retryArtwork ? 'Retry artwork' : 'Retry generation'}
            onClick={() =>
              void run(
                retryArtwork
                  ? 'podcasts.episodes.retryArtwork'
                  : 'podcasts.episodes.retry',
              )
            }
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          disabled={busy}
          aria-label={`${episode.archived ? 'Restore' : 'Archive'} ${episode.title}`}
          title={episode.archived ? 'Restore to library' : 'Archive'}
          onClick={() =>
            void run('podcasts.episodes.archive', {
              archived: !episode.archived,
            })
          }
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : episode.archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
        </Button>
        {episode.archived && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            disabled={busy}
            aria-label={`Delete ${episode.title}`}
            title="Delete permanently"
            onClick={() => {
              setError(undefined)
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {episode.archived && (
        <Dialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!busy) setDeleteOpen(open)
          }}
        >
          <DialogContent className="podcast-delete-dialog">
            <DialogHeader>
              <DialogTitle>Delete this episode?</DialogTitle>
              <DialogDescription>
                “{episode.title}” and its audio, transcript and artwork will be
                permanently deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
              >
                Keep episode
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => void run('podcasts.episodes.delete')}
              >
                {busy ? 'Deleting…' : 'Delete episode'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {error && !deleteOpen && (
        <p className="episode-row-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
