// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ComponentProps, act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { EpisodeView } from '../shared/podcast'
import PodcastsApp from './app'
import { expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({
  views: [] as EpisodeView[],
  get: vi.fn(),
  call: vi.fn(async () => ({ items: [], activeCount: 0 })),
}))
vi.mock('./lib/api', () => ({
  usePodcastApi: () => ({ ...fixtures, workspaceId: 'personal' }),
}))
vi.mock('@moldable-ai/ui', () => ({
  AppHeader: () => null,
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
}))
vi.mock('./components/episode-player', () => ({
  EpisodePlayer: ({ episode }: { episode: EpisodeView }) => {
    const [playing, setPlaying] = useState(false)
    return (
      <button data-player={episode.id} onClick={() => setPlaying(!playing)}>
        {playing ? 'Playing' : 'Paused'}: {episode.title}
      </button>
    )
  },
}))
vi.mock('./components/episode-cover', () => ({ EpisodeCover: () => null }))
vi.mock('./components/episode-notes', () => ({ EpisodeNotes: () => null }))
vi.mock('./components/generation-queue', () => ({
  GenerationQueueControl: () => <span data-queue>Queue</span>,
}))
vi.mock('./components/settings-dialog', () => ({ SettingsDialog: () => null }))
vi.mock('./components/create-episode-dialog', () => ({
  CreateEpisodeDialog: () => null,
}))

it('keeps the selected player and its playback mounted across library filters until another episode is selected', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  fixtures.views = ['one', 'two'].map((id) => ({
    id,
    title: id,
    description: '',
    status: 'ready',
    accent: 'blue',
    archived: false,
    revision: 1,
    createdAt: '',
    updatedAt: '',
    durationSeconds: 10,
    completedParts: 1,
    totalParts: 1,
    error: null,
    speakers: [],
    sources: [],
    parts: [],
    playback: { positionSeconds: 0, speed: 1, updatedAt: null },
  }))
  let resolveArchived!: (value: {
    items: EpisodeView[]
    nextOffset: null
  }) => void
  fixtures.get.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/episodes/'))
      return fixtures.views.find((view) => url.endsWith(view.id))
    if (url.includes('archived=true'))
      return new Promise((resolve) => {
        resolveArchived = resolve
      })
    return { items: fixtures.views, nextOffset: null }
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  const click = async (text: string) => {
    const button = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.startsWith(text),
    )
    expect(button).toBeDefined()
    await act(async () => button?.click())
    await settle()
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <PodcastsApp />
        </QueryClientProvider>,
      ),
    )
    await settle()
    await settle()
    const player = container.querySelector('[data-player="one"]')
    expect(player).not.toBeNull()
    await click('Paused: one')
    await click('Archived')
    expect(container.querySelector('[data-player="one"]')).toBe(player)
    expect(player?.textContent).toBe('Playing: one')
    await act(async () => resolveArchived({ items: [], nextOffset: null }))
    await settle()
    expect(container.querySelector('[data-player="one"]')).toBe(player)
    expect(player?.textContent).toBe('Playing: one')
    await click('All episodes')
    expect(container.querySelector('[data-queue]')).toBeNull()
    await act(async () =>
      (
        container.querySelector(
          '[aria-label="Archive one"]',
        ) as HTMLButtonElement
      ).click(),
    )
    await settle()
    expect(fixtures.call).toHaveBeenCalledWith('podcasts.episodes.archive', {
      id: 'one',
      expectedRevision: 1,
      archived: true,
    })
    expect(player?.textContent).toBe('Playing: one')
    expect(container.querySelector('[data-player="one"]')).toBe(player)
    await act(async () =>
      (
        container.querySelector(
          '[aria-label="Open episode: two"]',
        ) as HTMLButtonElement
      ).click(),
    )
    await settle()
    expect(container.querySelector('[data-player="one"]')).toBeNull()
    expect(container.querySelector('[data-player="two"]')).not.toBeNull()
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
    container.remove()
  }
})
