// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { EpisodeSummary } from '../../shared/podcast'
import { EpisodeRow } from './episode-row'
import { expect, it, vi } from 'vitest'

const call = vi.hoisted(() => vi.fn().mockResolvedValue({ deleted: true }))
vi.mock('../lib/api', () => ({ usePodcastApi: () => ({ call }) }))

it('offers Delete only in Archived and sends it only after confirmation', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const episode: EpisodeSummary = {
    id: 'one',
    title: 'Ocean stories',
    description: '',
    accent: 'blue',
    status: 'ready',
    revision: 4,
    archived: false,
    error: null,
    speakers: [],
    createdAt: '',
    updatedAt: '',
    completedParts: 1,
    totalParts: 1,
    durationSeconds: 10,
    playback: { positionSeconds: 0, speed: 1, updatedAt: null },
  }
  const onDeleted = vi.fn()
  const onSelect = vi.fn()
  const queryClient = new QueryClient()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (archived: boolean) =>
    act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <EpisodeRow
            episode={{ ...episode, archived }}
            selected
            onSelect={onSelect}
            onDeleted={onDeleted}
          />
        </QueryClientProvider>,
      ),
    )
  const clickText = (text: string) =>
    act(async () => {
      const button = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === text,
      )
      expect(button).toBeDefined()
      button?.click()
    })
  try {
    await render(false)
    expect(
      document.querySelector('[aria-label="Delete Ocean stories"]'),
    ).toBeNull()
    await render(true)
    const deleteButton = document.querySelector(
      '[aria-label="Delete Ocean stories"]',
    ) as HTMLButtonElement
    await act(async () => deleteButton.click())
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Ocean stories',
    )
    expect(call).not.toHaveBeenCalled()
    await clickText('Keep episode')
    expect(call).not.toHaveBeenCalled()
    await act(async () => deleteButton.click())
    await clickText('Delete episode')
    expect(call).toHaveBeenCalledExactlyOnceWith('podcasts.episodes.delete', {
      id: 'one',
      expectedRevision: 4,
    })
    expect(onDeleted).toHaveBeenCalledExactlyOnceWith('one')
    expect(onSelect).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
    container.remove()
  }
})
