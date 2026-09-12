import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@moldable-ai/ui'
import { usePodcastApi } from '../lib/api'
import type { EpisodeSummary, PodcastSettings } from '../../shared/podcast'
import { PodcastIdeaButton } from './podcast-idea-button'

const EPISODE_LENGTHS = [5, 10, 20] as const

export function CreateEpisodeDialog({
  open,
  onOpenChange,
  initialTopic = '',
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTopic?: string
  onCreated: (episode: EpisodeSummary) => void
}) {
  const { call, workspaceId } = usePodcastApi()
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['podcast-settings', workspaceId],
    queryFn: () => call<PodcastSettings>('podcasts.settings.get'),
    enabled: open,
  })
  const [topic, setTopic] = useState(initialTopic)
  const [chosenLength, setChosenLength] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const topicInput = useRef<HTMLTextAreaElement>(null)
  const receipt = useRef<{ content: string; requestId: string } | null>(null)
  const submitting = useRef(false)
  const minutes =
    chosenLength === null
      ? (settings.data?.minutes ?? 5)
      : (EPISODE_LENGTHS[chosenLength] ?? 5)
  const lengthIndex = EPISODE_LENGTHS.indexOf(minutes)
  async function submit() {
    if (
      submitting.current ||
      !topic.trim() ||
      settings.isPending ||
      settings.error
    )
      return
    submitting.current = true
    setBusy(true)
    setError(undefined)
    const content = JSON.stringify({ topic: topic.trim(), minutes })
    if (receipt.current?.content !== content)
      receipt.current = { content, requestId: crypto.randomUUID() }
    try {
      const result = await call<{ episode: EpisodeSummary }>(
        'podcasts.episodes.generate',
        {
          requestId: receipt.current.requestId,
          topic: topic.trim(),
          minutes,
        },
      )
      queryClient.setQueryData<PodcastSettings>(
        ['podcast-settings', workspaceId],
        (current) => (current ? { ...current, minutes } : current),
      )
      onCreated(result.episode)
      onOpenChange(false)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not start this episode.',
      )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <DialogContent
        className="create-dialog sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Create a podcast</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="episode-topic"
              className="mb-2 block text-sm font-medium"
            >
              Topic
            </label>
            <Textarea
              id="episode-topic"
              ref={topicInput}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Why does time feel faster as we get older?"
              maxLength={4000}
              rows={4}
              autoFocus
              required
              disabled={busy}
            />
            <PodcastIdeaButton
              active={open && !busy}
              onChoose={(idea) => {
                setTopic(idea)
                topicInput.current?.focus()
              }}
            />
          </div>
          <div>
            <label
              htmlFor="episode-length"
              className="mb-3 block text-sm font-medium"
            >
              Approximate length
            </label>
            <div className="length-slider">
              <div className="length-slider-track" aria-hidden="true">
                {EPISODE_LENGTHS.map((value) => (
                  <span key={value} />
                ))}
              </div>
              <input
                id="episode-length"
                type="range"
                min={0}
                max={2}
                step={1}
                disabled={busy || settings.isPending}
                value={lengthIndex}
                aria-valuetext={`${minutes} minutes`}
                onChange={(event) =>
                  setChosenLength(Number(event.target.value))
                }
              />
              <div className="length-slider-labels" aria-hidden="true">
                {EPISODE_LENGTHS.map((value) => (
                  <span
                    key={value}
                    className={minutes === value ? 'selected' : ''}
                  >
                    {value} min
                  </span>
                ))}
              </div>
            </div>
          </div>
          {settings.error && (
            <p role="alert" className="text-destructive text-sm">
              Could not load your preferences.{' '}
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => void settings.refetch()}
              >
                Try again
              </Button>
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button
            className="w-full cursor-pointer"
            type="submit"
            disabled={
              busy || !topic.trim() || settings.isPending || !!settings.error
            }
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {busy ? 'Starting…' : 'Create podcast'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
