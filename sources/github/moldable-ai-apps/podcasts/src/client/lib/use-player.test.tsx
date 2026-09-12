// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import type { EpisodeView } from '../../shared/podcast'
import { type SavePlayback, usePlayer } from './use-player'
import { afterEach, expect, it, vi } from 'vitest'

const episode: EpisodeView = {
  id: 'episode-one',
  title: 'Test episode',
  description: '',
  accent: 'blue',
  speakers: [],
  sources: [],
  status: 'ready',
  error: null,
  revision: 1,
  archived: false,
  createdAt: '',
  updatedAt: '',
  durationSeconds: 20,
  completedParts: 2,
  totalParts: 2,
  playback: { positionSeconds: 3, speed: 1.5, updatedAt: null },
  parts: [0, 1].map((index) => ({
    index,
    speakerId: 'host',
    text: 'Narration',
    durationSeconds: 10,
    byteLength: 100,
    audioPath: `/api/episodes/episode-one/audio/${index}.mp3?workspace=personal`,
  })),
}
let player: ReturnType<typeof usePlayer>
let root: Root | undefined
let container: HTMLDivElement
function Player({ save }: { save: SavePlayback }) {
  player = usePlayer(episode, save)
  return <audio ref={player.audioRef} {...player.events} />
}
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  container?.remove()
  vi.restoreAllMocks()
})
it('plays only on intent, seeks across files, advances between hosts, and saves committed interactions', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 1,
  })
  const save = vi.fn<SavePlayback>().mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<Player save={save} />))
  expect(play).not.toHaveBeenCalled()
  await act(async () => player.toggle())
  expect(player.audioRef.current?.getAttribute('src')).toContain('/0.mp3')
  await act(async () => player.events.onLoadedMetadata())
  expect(player.audioRef.current?.currentTime).toBe(3)
  expect(player.audioRef.current?.playbackRate).toBe(1.5)
  await act(async () => player.seek(15, false))
  await act(async () => player.events.onLoadedMetadata())
  expect(player.audioRef.current?.getAttribute('src')).toContain('/1.mp3')
  expect(player.audioRef.current?.currentTime).toBe(5)
  expect(save).toHaveBeenCalledTimes(1)
  await act(async () => player.commitSeek())
  expect(save).toHaveBeenLastCalledWith(15, 1.5, 'seek')
  await act(async () => player.seek(2))
  await act(async () => player.events.onEnded())
  expect(player.audioRef.current?.getAttribute('src')).toContain('/1.mp3')
  await act(async () => player.events.onEnded())
  expect(player.playing).toBe(false)
  expect(player.position).toBe(20)
  expect(save).toHaveBeenLastCalledWith(20, 1.5, 'ended')
})

it('waits at the live edge, resumes appended audio, and respects an explicit pause', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 1,
  })
  const save = vi.fn<SavePlayback>().mockResolvedValue(undefined)
  function LivePlayer({ view }: { view: EpisodeView }) {
    player = usePlayer(view, save)
    return <audio ref={player.audioRef} {...player.events} />
  }
  const first: EpisodeView = {
    ...episode,
    status: 'generating',
    durationSeconds: 10,
    completedParts: 1,
    totalParts: 1,
    creation: { topic: 'A story', minutes: 20, scriptReady: false },
    playback: { positionSeconds: 0, speed: 1, updatedAt: null },
    parts: episode.parts.slice(0, 1),
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(<LivePlayer view={first} />)
  })
  expect(play).not.toHaveBeenCalled()
  await act(async () => {
    player.toggle()
    player.events.onLoadedMetadata()
  })
  await act(async () => {
    player.events.onEnded()
  })
  expect(player.waitingForMore).toBe(true)
  expect(player.playing).toBe(true)
  expect(player.position).toBe(10)
  expect(save.mock.calls.some((call) => call[2] === 'ended')).toBe(false)
  const second: EpisodeView = {
    ...first,
    durationSeconds: 20,
    completedParts: 2,
    totalParts: 2,
    parts: episode.parts,
  }
  await act(async () => {
    root?.render(<LivePlayer view={second} />)
  })
  expect(play).toHaveBeenCalledTimes(2)
  expect(player.activePart).toBe(1)
  expect(player.waitingForMore).toBe(false)
  await act(async () => {
    player.events.onLoadedMetadata()
    player.events.onEnded()
  })
  expect(player.waitingForMore).toBe(true)
  await act(async () => {
    player.toggle()
  })
  expect(player.waitingForMore).toBe(false)
  expect(player.playing).toBe(false)
  const final: EpisodeView = {
    ...second,
    status: 'ready',
    creation: { ...first.creation!, scriptReady: true },
    durationSeconds: 30,
    completedParts: 3,
    totalParts: 3,
    parts: [
      ...episode.parts,
      {
        ...episode.parts[1]!,
        index: 2,
        audioPath: '/api/episodes/episode-one/audio/2.mp3',
      },
    ],
  }
  await act(async () => {
    root?.render(<LivePlayer view={final} />)
  })
  expect(play).toHaveBeenCalledTimes(2)
  expect(player.playing).toBe(false)
  await act(async () => {
    player.toggle()
    player.events.onLoadedMetadata()
  })
  expect(player.activePart).toBe(2)
  await act(async () => {
    player.events.onEnded()
  })
  expect(player.waitingForMore).toBe(false)
  expect(player.playing).toBe(false)
  expect(save).toHaveBeenLastCalledWith(30, 1, 'ended')
})

it('leaves the waiting state when generation fails without starting audio on a later retry', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const save = vi.fn<SavePlayback>().mockResolvedValue(undefined)
  function LivePlayer({ view }: { view: EpisodeView }) {
    player = usePlayer(view, save)
    return <audio ref={player.audioRef} {...player.events} />
  }
  const generating: EpisodeView = {
    ...episode,
    status: 'generating',
    creation: { topic: 'A story', minutes: 10, scriptReady: false },
    playback: { positionSeconds: 0, speed: 1, updatedAt: null },
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(<LivePlayer view={generating} />)
  })
  await act(async () => {
    player.toggle()
    player.seek(15)
    player.events.onLoadedMetadata()
    player.events.onEnded()
  })
  expect(player.waitingForMore).toBe(true)
  await act(async () => {
    root?.render(<LivePlayer view={{ ...generating, status: 'failed' }} />)
  })
  expect(player.waitingForMore).toBe(false)
  expect(player.playing).toBe(false)
  const attempts = play.mock.calls.length
  await act(async () => {
    root?.render(<LivePlayer view={generating} />)
  })
  expect(play).toHaveBeenCalledTimes(attempts)
})

it('auto-starts the creating window once when its first section arrives and preserves a pause', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const save = vi.fn<SavePlayback>().mockResolvedValue(undefined)
  const handled = vi.fn()
  function CreatingPlayer({ view }: { view: EpisodeView }) {
    player = usePlayer(view, save, {
      autoPlay: true,
      onAutoPlayHandled: handled,
    })
    return <audio ref={player.audioRef} {...player.events} />
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <CreatingPlayer
        view={{
          ...episode,
          completedParts: 0,
          parts: [],
          durationSeconds: 0,
          status: 'generating',
        }}
      />,
    ),
  )
  expect(play).not.toHaveBeenCalled()
  expect(handled).not.toHaveBeenCalled()
  await act(async () =>
    root?.render(
      <CreatingPlayer
        view={{
          ...episode,
          completedParts: 1,
          parts: episode.parts.slice(0, 1),
          durationSeconds: 10,
          status: 'generating',
        }}
      />,
    ),
  )
  expect(play).toHaveBeenCalledOnce()
  expect(handled).toHaveBeenCalledOnce()
  expect(player.position).toBe(0)
  expect(save).toHaveBeenLastCalledWith(0, 1.5, 'play')
  await act(async () => player.toggle())
  await act(async () => root?.render(<CreatingPlayer view={episode} />))
  expect(play).toHaveBeenCalledOnce()
  expect(player.playing).toBe(false)
})

it('starts once under StrictMode and offers Play if the host requires a gesture', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockRejectedValueOnce(
      new DOMException('Gesture required', 'NotAllowedError'),
    )
    .mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const save = vi.fn<SavePlayback>().mockResolvedValue(undefined)
  const { StrictMode } = await import('react')
  function CreatingPlayer() {
    player = usePlayer(episode, save, { autoPlay: true })
    return <audio ref={player.audioRef} {...player.events} />
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <StrictMode>
        <CreatingPlayer />
      </StrictMode>,
    ),
  )
  expect(play).toHaveBeenCalledOnce()
  expect(player.playing).toBe(false)
  expect(player.error).toBe('Tap Play to start listening.')
  await act(async () => player.toggle())
  expect(play).toHaveBeenCalledTimes(2)
  expect(player.playing).toBe(true)
  expect(player.error).toBeUndefined()
})
