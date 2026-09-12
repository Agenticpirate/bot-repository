import {
  ChevronDown,
  FileText,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@moldable-ai/ui'
import { usePodcastApi } from '../lib/api'
import { expectsMoreAudio } from '../lib/playback'
import { type PlaybackEvent, usePlayer } from '../lib/use-player'
import { type EpisodeView, formatTime } from '../../shared/podcast'
import { EpisodeCover } from './episode-cover'

export function EpisodePlayer({
  episode,
  compact = false,
  onDetails,
  autoPlay = false,
  onAutoPlayHandled,
  statusControl,
}: {
  episode: EpisodeView
  compact?: boolean
  onDetails?: () => void
  autoPlay?: boolean
  onAutoPlayHandled?: () => void
  statusControl?: React.ReactNode
}) {
  const { call } = usePodcastApi()
  const savePlayback = useCallback(
    (positionSeconds: number, speed: number, event: PlaybackEvent) =>
      call('podcasts.playback.update', {
        id: episode.id,
        positionSeconds,
        speed,
        event,
      }),
    [call, episode.id],
  )
  const player = usePlayer(episode, savePlayback, {
    autoPlay,
    onAutoPlayHandled,
  })
  const [muted, setMuted] = useState(false)
  const canPlay = episode.completedParts > 0
  const making = expectsMoreAudio(episode)
  const rates = [0.75, 1, 1.25, 1.5, 2]
  return (
    <section
      className={`episode-player ${compact ? 'player-compact' : 'player-hero'} ${!canPlay && !making ? 'player-unavailable' : ''}`}
      data-accent={episode.accent}
      aria-label={`Player for ${episode.title}`}
    >
      <audio ref={player.audioRef} preload="none" {...player.events} />
      <div className="player-heading">
        <EpisodeCover
          accent={episode.accent}
          small={compact}
          imagePath={episode.thumbnailPath}
        />
        <div className="player-title-block">
          <h2>{episode.title}</h2>
        </div>
        {statusControl}
      </div>
      <div className="player-body">
        {canPlay ? (
          <>
            <div className="player-timeline">
              <span>{formatTime(player.position)}</span>
              <input
                type="range"
                min={0}
                max={episode.durationSeconds || 1}
                step={0.1}
                value={Math.min(player.position, episode.durationSeconds)}
                disabled={!canPlay}
                onChange={(event) =>
                  player.seek(Number(event.target.value), false)
                }
                onPointerUp={player.commitSeek}
                onKeyUp={(event) => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                      'Home',
                      'End',
                      'PageUp',
                      'PageDown',
                    ].includes(event.key)
                  )
                    player.commitSeek()
                }}
                aria-label="Seek episode"
                aria-valuetext={`${formatTime(player.position)} of ${formatTime(episode.durationSeconds)}`}
                style={
                  {
                    '--played': `${episode.durationSeconds ? (player.position / episode.durationSeconds) * 100 : 0}%`,
                  } as React.CSSProperties
                }
              />
              <span>{formatTime(episode.durationSeconds)}</span>
            </div>
            <div className="player-controls">
              <button
                className="speed-control"
                type="button"
                aria-label={`Playback speed ${player.speed} times. Change speed`}
                disabled={!canPlay}
                onClick={() =>
                  player.changeSpeed(
                    rates[(rates.indexOf(player.speed) + 1) % rates.length] ??
                      1,
                  )
                }
              >
                {player.speed}×
              </button>
              <button
                className="skip-control"
                type="button"
                aria-label="Skip back 15 seconds"
                disabled={!canPlay}
                onClick={() => player.seek(player.position - 15)}
              >
                <RotateCcw aria-hidden="true" />
                <span aria-hidden="true">15</span>
              </button>
              <Button
                className="play-control cursor-pointer"
                disabled={!canPlay}
                onClick={player.toggle}
                aria-label={player.playing ? 'Pause episode' : 'Play episode'}
              >
                {player.loading && player.playing ? (
                  <LoaderCircle className="animate-spin" />
                ) : player.playing ? (
                  <Pause fill="currentColor" />
                ) : (
                  <Play fill="currentColor" />
                )}
              </Button>
              <button
                className="skip-control"
                type="button"
                aria-label="Skip forward 15 seconds"
                disabled={!canPlay}
                onClick={() => player.seek(player.position + 15)}
              >
                <RotateCw aria-hidden="true" />
                <span aria-hidden="true">15</span>
              </button>
              {!compact && (
                <button
                  className="volume-control"
                  type="button"
                  aria-label={muted ? 'Unmute episode' : 'Mute episode'}
                  disabled={!canPlay}
                  onClick={() => {
                    setMuted(!muted)
                    if (player.audioRef.current)
                      player.audioRef.current.muted = !muted
                  }}
                >
                  {muted ? <VolumeX /> : <Volume2 />}
                </button>
              )}
            </div>
            {player.waitingForMore && (
              <p className="partial-note" role="status">
                Waiting for the next section…
              </p>
            )}
          </>
        ) : null}
        {player.error && (
          <p className="player-error" role="alert">
            {player.error}
          </p>
        )}
        {onDetails && !compact && (
          <button className="player-details" type="button" onClick={onDetails}>
            <FileText className="size-3.5" />
            <span>Transcript</span>
            <ChevronDown className="size-3.5" />
          </button>
        )}
      </div>
    </section>
  )
}
