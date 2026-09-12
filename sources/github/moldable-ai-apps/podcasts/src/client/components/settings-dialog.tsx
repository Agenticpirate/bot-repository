import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moldable-ai/ui'
import { usePodcastApi } from '../lib/api'
import { type PodcastSettings, voices } from '../../shared/podcast'

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { call, workspaceId } = usePodcastApi()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const query = useQuery({
    queryKey: ['podcast-settings', workspaceId],
    queryFn: () => call<PodcastSettings>('podcasts.settings.get'),
    enabled: open,
  })
  const saveVoice = async (voice: string) => {
    setBusy(true)
    setError(undefined)
    try {
      const settings = await call<PodcastSettings>('podcasts.settings.update', {
        voice,
      })
      queryClient.setQueryData(['podcast-settings', workspaceId], settings)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not save your voice preference.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="podcast-settings-dialog"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Podcast settings</DialogTitle>
        </DialogHeader>
        <div className="podcast-voice-setting">
          <label htmlFor="podcast-voice" className="text-sm font-medium">
            Narration voice
          </label>
          <p className="podcast-voice-help">For new episodes</p>
          <Select
            value={query.data?.voice ?? ''}
            onValueChange={(voice) => void saveVoice(voice)}
            disabled={busy || !query.data}
          >
            <SelectTrigger
              id="podcast-voice"
              className="podcast-voice-select cursor-pointer"
            >
              <SelectValue placeholder="Loading voices…" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem
                  key={voice}
                  value={voice}
                  className="cursor-pointer"
                >
                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(error || query.error) && (
          <p role="alert" className="text-destructive text-sm">
            {error ?? query.error?.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
