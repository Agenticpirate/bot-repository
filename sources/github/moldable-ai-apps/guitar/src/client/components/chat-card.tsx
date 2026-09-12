import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { DEFAULT_GUITAR_PRESET_ID } from '../audio-presets'
import { midiToFretPosition } from '../guitar-utils'
import { useGuitarAudio } from '../use-guitar-audio'
import { GuitarFretboard } from './guitar-fretboard'

interface SongCard {
  id: string
  title: string
  composer: string
  bpm: number
  duration: number
  previewSeconds: number
  previewLimited: boolean
  notes: {
    id: string
    midi: number
    pitch: string
    start: number
    duration: number
    velocity?: number
  }[]
  tutorial?: {
    title?: string
    summary: string
    objectives: string[]
    sections: { id: string; title: string; focus?: string; learn: string[] }[]
  }
}
function Instrument({ song }: { song: SongCard }) {
  return (
    <div inert className="overflow-hidden" style={{ height: 110 }}>
      <div style={{ transform: 'scale(.42)', transformOrigin: 'top left' }}>
        <GuitarFretboard
          activePositions={song.notes.slice(0, 4).map((note) => ({
            ...midiToFretPosition(note.midi),
            tone: 'var(--primary)',
          }))}
        />
      </div>
    </div>
  )
}
function SongDetail({ song }: { song: SongCard }) {
  const { fetchWithWorkspace } = useWorkspace()
  const { prepare, playMidi, stopAll, loadState } = useGuitarAudio(
    DEFAULT_GUITAR_PRESET_ID,
    null,
    null,
    fetchWithWorkspace,
  )
  const [error, setError] = useState<string>()
  const [playing, setPlaying] = useState(false)
  const epoch = useRef(0)
  const timeout = useRef<number | undefined>(undefined)
  useEffect(
    () => () => {
      epoch.current += 1
      window.clearTimeout(timeout.current)
      stopAll()
    },
    [stopAll],
  )
  const stop = () => {
    epoch.current += 1
    window.clearTimeout(timeout.current)
    stopAll()
    setPlaying(false)
  }
  const play = async () => {
    const token = ++epoch.current
    setError(undefined)
    setPlaying(true)
    try {
      await prepare()
      if (epoch.current !== token) return
      stopAll()
      for (const note of song.notes)
        playMidi(note.midi, note.duration, note.velocity, note.start)
      timeout.current = window.setTimeout(
        () => {
          stopAll()
          setPlaying(false)
        },
        song.previewSeconds * 1000 + 250,
      )
    } catch (error) {
      if (epoch.current === token) {
        setError(error instanceof Error ? error.message : String(error))
        setPlaying(false)
      }
    }
  }
  return (
    <article className="space-y-5 p-5">
      <h1 className="text-xl font-semibold">{song.title}</h1>
      <p className="text-muted-foreground text-sm">
        {song.composer} · {song.bpm} bpm
      </p>
      <Instrument song={song} />
      <button
        type="button"
        className="bg-primary text-primary-foreground cursor-pointer rounded-lg px-4 py-2 text-sm"
        onClick={() => (playing ? stop() : void play())}
      >
        {playing
          ? 'Stop preview'
          : `Play ${Math.round(song.previewSeconds)} second preview`}
      </button>
      {loadState.status === 'loading' && (
        <p role="status" className="text-muted-foreground text-xs">
          Loading instrument…
        </p>
      )}
      {(error || loadState.error) && (
        <p role="alert" className="text-destructive text-sm">
          {error || loadState.error}
        </p>
      )}
      {song.previewLimited && (
        <p className="text-muted-foreground text-xs">
          Preview includes the first 1,000 notes. Continue in Guitar for the
          complete piece.
        </p>
      )}
      {song.tutorial && (
        <>
          <p className="text-sm leading-relaxed">{song.tutorial.summary}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {song.tutorial.objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
          {song.tutorial.sections.map((section) => (
            <section key={section.id} className="space-y-2">
              <h2 className="font-medium">{section.title}</h2>
              {section.focus && (
                <p className="text-muted-foreground text-sm">{section.focus}</p>
              )}
              <ul className="space-y-1 text-sm">
                {section.learn.map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </article>
  )
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput')
  const preview = useQuery({
    queryKey: ['chat-song', input],
    queryFn: () => callCardApp<SongCard>('guitar', 'guitar.cards.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-song', input, 'detail'],
    queryFn: () =>
      callCardApp<SongCard>('guitar', 'guitar.cards.read', { detail: true }),
    enabled: expanded,
  })
  const song = preview.data
  return (
    <div ref={contentRef} className="bg-background">
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading song…
        </p>
      )}
      {(error || preview.error || (expanded && detail.error)) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {song && (
        <>
          <div
            hidden={expanded}
            className="border-border relative overflow-hidden rounded-xl border p-3"
          >
            <Instrument song={song} />
            <h2 className="truncate text-sm font-medium">{song.title}</h2>
            <p className="text-muted-foreground text-xs">
              {song.composer || 'Guitar'} · {song.bpm} bpm
            </p>
            <button
              type="button"
              aria-label={`Preview ${song.title}`}
              className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook(song.id).catch((error) =>
                  setError(String(error)),
                )
              }}
            />
          </div>
          {expanded &&
            (detail.data ? (
              <SongDetail song={detail.data} />
            ) : (
              <p role="status" className="text-muted-foreground p-4 text-sm">
                Loading lesson…
              </p>
            ))}
        </>
      )}
    </div>
  )
}
