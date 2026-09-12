// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import type { EpisodeView } from '../../shared/podcast'
import { EpisodeNotes } from './episode-notes'
import { EpisodePlayer } from './episode-player'
import { expect, it, vi } from 'vitest'

vi.mock('../lib/api', () => ({
  usePodcastApi: () => ({ call: async () => ({}) }),
}))
const episode: EpisodeView = {
  id: 'test',
  title: 'An episode',
  description: '',
  accent: 'blue',
  speakers: [
    { id: 'narrator', name: 'Marin', voice: 'marin', instructions: '' },
  ],
  sources: [],
  status: 'failed',
  error: {
    code: 'missing_speech_permission',
    message: 'Key needs speech permission.',
  },
  revision: 1,
  archived: false,
  createdAt: '',
  updatedAt: '',
  durationSeconds: 0,
  completedParts: 0,
  totalParts: 1,
  playback: { positionSeconds: 0, speed: 1, updatedAt: null },
  parts: [
    {
      index: 0,
      speakerId: 'narrator',
      text: 'Written narration.',
      durationSeconds: null,
      byteLength: null,
      audioPath: null,
    },
  ],
}
it.each([false, true])(
  'keeps generation details in the queue before audio exists (compact=%s)',
  (compact) => {
    const markup = renderToStaticMarkup(
      <EpisodePlayer
        compact={compact}
        episode={{
          ...episode,
          status: 'generating',
          error: null,
          totalParts: 0,
          parts: [],
          creation: { topic: 'Time', minutes: 5, scriptReady: false },
        }}
      />,
    )
    expect(markup).not.toContain('Writing your episode')
    expect(markup).not.toContain('Play episode')
    expect(markup).not.toContain('Recording part')
  },
)
it.each([false, true])(
  'omits playback and completed-audio labels without saved audio (compact=%s)',
  (compact) => {
    const markup = renderToStaticMarkup(
      <EpisodePlayer episode={episode} compact={compact} />,
    )
    expect(markup).not.toContain('Play episode')
    expect(markup).not.toContain('Seek episode')
    expect(markup).not.toContain('AI narrated')
    expect(markup).not.toContain('Saved audio')
    expect(markup).toContain(episode.title)
  },
)
it.each([false, true])(
  'shows actual saved audio controls (compact=%s)',
  (compact) => {
    const ready: EpisodeView = {
      ...episode,
      status: 'ready',
      error: null,
      durationSeconds: 12,
      completedParts: 1,
      parts: [
        {
          ...episode.parts[0]!,
          durationSeconds: 12,
          byteLength: 2000,
          audioPath: '/api/episodes/test/audio/0.mp3',
        },
      ],
    }
    const markup = renderToStaticMarkup(
      <EpisodePlayer episode={ready} compact={compact} />,
    )
    expect(markup).toContain('Play episode')
    expect(markup).toContain('Seek episode')
    expect(markup).toContain('0:12')
  },
)
it.each([false, true])(
  'allows early playback while more sections are being written (compact=%s)',
  (compact) => {
    const markup = renderToStaticMarkup(
      <EpisodePlayer
        compact={compact}
        episode={{
          ...episode,
          status: 'generating',
          error: null,
          creation: { topic: 'A story', minutes: 20, scriptReady: false },
          durationSeconds: 12,
          completedParts: 1,
          parts: [
            {
              ...episode.parts[0]!,
              durationSeconds: 12,
              byteLength: 2000,
              audioPath: '/api/episodes/test/audio/0.mp3',
            },
          ],
        }}
      />,
    )
    expect(markup).toContain('Play episode')
    expect(markup).not.toContain('Writing more')
    expect(markup).not.toContain('Marin')
    expect(markup).not.toContain('Recording more')
    expect(markup).not.toContain('Stop')
  },
)

it('renders transcript text without a narrator label', () => {
  const markup = renderToStaticMarkup(<EpisodeNotes episode={episode} />)
  expect(markup).toContain('Written narration.')
  expect(markup).not.toContain('Marin')
  expect(markup).not.toContain('speaker-name')
})

it('keeps compact cards focused on listening controls', () => {
  const ready: EpisodeView = {
    ...episode,
    status: 'ready',
    completedParts: 1,
    durationSeconds: 12,
    error: null,
    parts: [
      {
        ...episode.parts[0]!,
        durationSeconds: 12,
        byteLength: 100,
        audioPath: '/api/episodes/test/audio/0.mp3',
      },
    ],
  }
  const compact = renderToStaticMarkup(
    <EpisodePlayer episode={ready} compact onDetails={() => {}} />,
  )
  expect(compact).toContain('Seek episode')
  expect(compact).toContain('Playback speed')
  expect(compact).not.toContain('Transcript')
  expect(compact).not.toContain('Mute episode')
  const full = renderToStaticMarkup(
    <EpisodePlayer episode={ready} onDetails={() => {}} />,
  )
  expect(full).toContain('Transcript')
  expect(full).toContain('Mute episode')
})
