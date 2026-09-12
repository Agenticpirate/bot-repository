import { useCallback, useEffect, useRef, useState } from 'react'
import type { EpisodeView } from '../../shared/podcast'
import { expectsMoreAudio, locatePosition, playableParts } from './playback'

export type PlaybackEvent = 'play' | 'pause' | 'seek' | 'speed' | 'ended'
export type SavePlayback = (
  positionSeconds: number,
  speed: number,
  event: PlaybackEvent,
) => Promise<unknown>

export function usePlayer(
  episode: EpisodeView,
  savePlayback: SavePlayback,
  options: { autoPlay?: boolean; onAutoPlayHandled?: () => void } = {},
) {
  const { autoPlay, onAutoPlayHandled } = options
  const audioRef = useRef<HTMLAudioElement>(null)
  const episodeRef = useRef(episode)
  const saveRef = useRef(savePlayback)
  episodeRef.current = episode
  saveRef.current = savePlayback
  const [position, setPosition] = useState(episode.playback.positionSeconds)
  const positionRef = useRef(position)
  const [speed, setSpeed] = useState(episode.playback.speed)
  const speedRef = useRef(speed)
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [waitingForMore, setWaitingForMore] = useState(false)
  const waitingRef = useRef(false)
  const [error, setError] = useState<string>()
  const partIndex = useRef<number | null>(null)
  const [activePart, setActivePart] = useState<number | null>(null)
  const pendingTime = useRef<number | null>(null)
  const playAttempt = useRef(0)
  const mounted = useRef(true)
  const autoPlayConsumed = useRef(false)
  const invalidatePlay = useCallback(() => {
    ++playAttempt.current
  }, [])
  const writes = useRef(Promise.resolve())

  const save = useCallback((event: PlaybackEvent) => {
    const seconds = positionRef.current
    const rate = speedRef.current
    const persist = saveRef.current
    writes.current = writes.current
      .catch(() => {})
      .then(async () => {
        try {
          await persist(seconds, rate, event)
        } catch {
          if (mounted.current)
            setError(
              'Audio can still play, but your listening position could not be saved.',
            )
        }
      })
  }, [])

  const move = useCallback((seconds: number, resume: boolean) => {
    const audio = audioRef.current
    const target = locatePosition(playableParts(episodeRef.current), seconds)
    if (!audio || !target) return
    const attempt = ++playAttempt.current
    waitingRef.current = false
    setWaitingForMore(false)
    setError(undefined)
    positionRef.current = target.position
    setPosition(target.position)
    setActivePart(target.part.index)
    if (partIndex.current !== target.part.index) {
      partIndex.current = target.part.index
      pendingTime.current = target.localTime
      audio.src = target.part.audioPath
      audio.load()
    } else if (audio.readyState >= 1) audio.currentTime = target.localTime
    else pendingTime.current = target.localTime
    audio.playbackRate = speedRef.current
    playingRef.current = resume
    setPlaying(resume)
    if (resume) {
      setLoading(true)
      void audio.play().catch((error: unknown) => {
        if (attempt !== playAttempt.current || !mounted.current) return
        playingRef.current = false
        setPlaying(false)
        setLoading(false)
        setError(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'Tap Play to start listening.'
            : 'Could not play this audio. Check the connection to your Mac and try again.',
        )
      })
    } else {
      audio.pause()
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!autoPlay || autoPlayConsumed.current || episode.completedParts === 0)
      return
    let cancelled = false
    // Defer past StrictMode's mount cleanup so it cannot consume the intent
    // and immediately stop the first playback attempt.
    queueMicrotask(() => {
      if (cancelled || !mounted.current || autoPlayConsumed.current) return
      autoPlayConsumed.current = true
      onAutoPlayHandled?.()
      if (!playingRef.current) {
        move(0, true)
        save('play')
      }
    })
    return () => {
      cancelled = true
    }
  }, [autoPlay, onAutoPlayHandled, episode.completedParts, move, save])

  const toggle = useCallback(() => {
    if (playingRef.current) {
      ++playAttempt.current
      waitingRef.current = false
      setWaitingForMore(false)
      playingRef.current = false
      audioRef.current?.pause()
      setPlaying(false)
      setLoading(false)
      save('pause')
    } else {
      const total = episodeRef.current.durationSeconds
      if (
        total > 0 &&
        positionRef.current >= total - 0.1 &&
        expectsMoreAudio(episodeRef.current)
      ) {
        playingRef.current = true
        setPlaying(true)
        waitingRef.current = true
        setWaitingForMore(true)
        setLoading(true)
        save('play')
        return
      }
      move(positionRef.current >= total - 0.1 ? 0 : positionRef.current, true)
      save('play')
    }
  }, [move, save])

  const seek = useCallback(
    (seconds: number, persist = true) => {
      move(seconds, playingRef.current)
      if (persist) save('seek')
    },
    [move, save],
  )
  const commitSeek = useCallback(() => save('seek'), [save])
  const changeSpeed = useCallback(
    (rate: number) => {
      speedRef.current = rate
      setSpeed(rate)
      if (audioRef.current) audioRef.current.playbackRate = rate
      save('speed')
    },
    [save],
  )

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (pendingTime.current !== null) {
      audio.currentTime = pendingTime.current
      pendingTime.current = null
    }
    audio.playbackRate = speedRef.current
    setLoading(false)
  }, [])
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    const part = playableParts(episodeRef.current).find(
      (item) => item.index === partIndex.current,
    )
    if (!audio || !part || pendingTime.current !== null) return
    const next = Math.min(
      episodeRef.current.durationSeconds,
      part.offset + audio.currentTime,
    )
    positionRef.current = next
    setPosition(next)
  }, [])
  const onEnded = useCallback(() => {
    if (!playingRef.current) return
    const parts = playableParts(episodeRef.current)
    const currentIndex = parts.findIndex(
      (part) => part.index === partIndex.current,
    )
    const next = parts[currentIndex + 1]
    if (next && currentIndex >= 0) move(next.offset, true)
    else {
      positionRef.current = episodeRef.current.durationSeconds
      setPosition(positionRef.current)
      if (expectsMoreAudio(episodeRef.current)) {
        waitingRef.current = true
        setWaitingForMore(true)
        setLoading(true)
        return
      }
      playingRef.current = false
      setPlaying(false)
      setLoading(false)
      save('ended')
    }
  }, [move, save])
  const onPause = useCallback(() => {
    const audio = audioRef.current
    if (
      !audio?.paused ||
      audio.ended ||
      !playingRef.current ||
      waitingRef.current ||
      pendingTime.current !== null
    )
      return
    playingRef.current = false
    setPlaying(false)
    setLoading(false)
    save('pause')
  }, [save])
  const onError = useCallback(() => {
    ++playAttempt.current
    waitingRef.current = false
    setWaitingForMore(false)
    playingRef.current = false
    setPlaying(false)
    setLoading(false)
    setError(
      'The audio could not load. Check the connection to your Mac, then try again.',
    )
    partIndex.current = null
  }, [])

  useEffect(() => {
    if (!waitingRef.current || !playingRef.current) return
    const available = playableParts(episode)
    const next = available.find(
      (part) =>
        part.offset >= positionRef.current - 0.01 &&
        part.index !== partIndex.current,
    )
    if (next) {
      move(next.offset, true)
    } else if (!expectsMoreAudio(episode)) {
      waitingRef.current = false
      setWaitingForMore(false)
      playingRef.current = false
      setPlaying(false)
      setLoading(false)
      save(
        episode.status === 'failed' || episode.status === 'cancelled'
          ? 'pause'
          : 'ended',
      )
    }
  }, [episode, move, save])

  useEffect(() => {
    mounted.current = true
    const audio = audioRef.current
    return () => {
      mounted.current = false
      invalidatePlay()
      if (playingRef.current) save('pause')
      playingRef.current = false
      waitingRef.current = false
      audio?.pause()
      audio?.removeAttribute('src')
    }
  }, [save, invalidatePlay])

  return {
    audioRef,
    position,
    speed,
    playing,
    loading,
    waitingForMore,
    error,
    activePart,
    toggle,
    seek,
    commitSeek,
    changeSpeed,
    events: {
      onLoadedMetadata,
      onTimeUpdate,
      onEnded,
      onError,
      onPause,
      onWaiting: () => setLoading(true),
      onPlaying: () => setLoading(false),
    },
  }
}
