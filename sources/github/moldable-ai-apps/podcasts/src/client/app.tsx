import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  ArrowUpRight,
  ListMusic,
  LoaderCircle,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { AppHeader, Button, Input } from '@moldable-ai/ui'
import { usePodcastApi } from './lib/api'
import { CreateEpisodeDialog } from './components/create-episode-dialog'
import { EpisodeNotes } from './components/episode-notes'
import { EpisodePlayer } from './components/episode-player'
import { EpisodeRow } from './components/episode-row'
import {
  GenerationQueueControl,
  type QueueSnapshot,
} from './components/generation-queue'
import { LibraryEmptyState } from './components/library-empty-state'
import { SettingsDialog } from './components/settings-dialog'
import { type EpisodeSummary, type EpisodeView } from '../shared/podcast'

interface LibraryPage {
  items: EpisodeSummary[]
  nextOffset: number | null
}
const suggestions = [
  'Why does time feel faster as we get older?',
  'How did Nvidia become so important to AI?',
  'Why is housing so expensive, and what would fix it?',
  'What actually happens inside a black hole?',
  'How does a song get stuck in your head?',
  'How did the Roman Empire fall apart?',
]

function EpisodeDetail({
  id,
  autoPlay,
  onAutoPlayHandled,
}: {
  id: string
  autoPlay?: boolean
  onAutoPlayHandled: () => void
}) {
  const { get, workspaceId } = usePodcastApi()
  const [notesOpen, setNotesOpen] = useState(false)
  const query = useQuery({
    queryKey: ['episode', workspaceId, id],
    queryFn: () => get<EpisodeView>(`/api/episodes/${id}`),
    refetchInterval: (query) =>
      ['queued', 'generating'].includes(query.state.data?.status ?? '')
        ? 2500
        : 30_000,
    refetchOnWindowFocus: true,
  })
  const episode = query.data
  if (query.isPending)
    return (
      <div className="player-placeholder" role="status">
        <LoaderCircle className="size-5 animate-spin" />
        Loading your episode…
      </div>
    )
  if (query.error)
    return (
      <p className="status-error" role="alert">
        {query.error.message}
        <Button
          variant="ghost"
          onClick={() => void query.refetch()}
          className="cursor-pointer"
        >
          Try again
        </Button>
      </p>
    )
  if (!episode) return null
  return (
    <div>
      <EpisodePlayer
        key={id}
        episode={episode}
        onDetails={() => setNotesOpen(!notesOpen)}
        autoPlay={autoPlay}
        onAutoPlayHandled={onAutoPlayHandled}
      />
      {notesOpen && <EpisodeNotes episode={episode} />}
    </div>
  )
}

export default function PodcastsApp() {
  const { workspaceId } = usePodcastApi()
  return <WorkspacePodcastsApp key={workspaceId} />
}

function WorkspacePodcastsApp() {
  const { get, workspaceId } = usePodcastApi()
  const queryClient = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const query = useDeferredValue(queryText)
  const [archived, setArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null | undefined>(
    undefined,
  )
  const [create, setCreate] = useState<{ topic: string } | null>(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null)
  const { call } = usePodcastApi()
  const queue = useQuery({
    queryKey: ['podcast-queue', workspaceId],
    queryFn: () => call<QueueSnapshot>('podcasts.queue.get'),
    refetchInterval: (query) => (query.state.data?.activeCount ? 2500 : 15_000),
  })
  const selectEpisode = (id: string) => {
    setSelectedId(id)
    setAutoPlayId(null)
  }
  const library = useInfiniteQuery({
    queryKey: ['podcasts', workspaceId, query, archived],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      get<LibraryPage>(
        `/api/episodes?query=${encodeURIComponent(query)}&archived=${archived}&offset=${pageParam}`,
      ),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
  const items = [
    ...new Map(
      (library.data?.pages.flatMap((page) => page.items) ?? []).map(
        (episode) => [episode.id, episode],
      ),
    ).values(),
  ]
  // Capture the initial selection independently of library filters and refreshes.
  if (selectedId === undefined && items[0]) setSelectedId(items[0].id)
  const activeId = selectedId
  const empty = !library.isPending && !library.error && items.length === 0
  return (
    <div className="podcasts-app">
      <AppHeader
        title="Podcasts"
        desktop={false}
        actions={[
          ...(queue.data?.activeCount
            ? [
                {
                  label: `Queue (${queue.data.activeCount})`,
                  icon: ListMusic,
                  onPress: () => setQueueOpen(true),
                  placement: 'overflow' as const,
                },
              ]
            : []),
          {
            label: 'Settings',
            icon: Settings,
            onPress: () => setSettingsOpen(true),
            placement: 'overflow',
          },
          {
            label: 'Create a podcast',
            icon: Plus,
            onPress: () => setCreate({ topic: '' }),
          },
        ]}
      />
      <header className="podcasts-header">
        <h1>
          Podcasts<span className="title-dot">.</span>
        </h1>
        <div className="podcasts-header-actions">
          {(queue.data?.activeCount ?? 0) > 0 && (
            <GenerationQueueControl
              open={queueOpen}
              onOpenChange={setQueueOpen}
              snapshot={queue.data ?? { items: [], activeCount: 0 }}
              pending={queue.isPending}
              error={queue.error?.message}
              onSelect={selectEpisode}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => setSettingsOpen(true)}
            aria-label="Podcast settings"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            onClick={() => setCreate({ topic: '' })}
            className="create-button cursor-pointer"
            aria-label="Create a podcast"
          >
            <Plus className="size-4" />
            <span>Create a podcast</span>
          </Button>
        </div>
      </header>
      {activeId ? (
        <EpisodeDetail
          key={`${workspaceId}-${activeId}`}
          id={activeId}
          autoPlay={autoPlayId === activeId}
          onAutoPlayHandled={() => setAutoPlayId(null)}
        />
      ) : library.isPending ? (
        <div role="status" className="player-placeholder">
          <LoaderCircle className="size-5 animate-spin" />
          Opening your library…
        </div>
      ) : null}
      {empty && !query && !archived && !activeId && (
        <section className="podcasts-empty">
          <h2>What would you like to listen to?</h2>
          <p>Choose a topic or create your own.</p>
          <div className="idea-grid">
            {suggestions.map((topic) => (
              <button
                key={topic}
                type="button"
                className="idea-card bg-card"
                onClick={() => setCreate({ topic })}
              >
                <span>{topic}</span>
                <ArrowUpRight className="size-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
      {(!empty || query || archived || activeId) && (
        <section className="library-section">
          <div className="library-header">
            <div className="library-tabs">
              <button
                type="button"
                className={!archived ? 'active' : ''}
                onClick={() => {
                  setArchived(false)
                }}
              >
                All episodes{' '}
                <span>
                  {!archived
                    ? `${items.length}${library.hasNextPage ? '+' : ''}`
                    : ''}
                </span>
              </button>
              <button
                type="button"
                className={archived ? 'active' : ''}
                onClick={() => {
                  setArchived(true)
                }}
              >
                Archived
              </button>
            </div>
            <div
              className="library-search"
              data-expanded={searchFocused || queryText.length > 0}
            >
              <Search className="size-4" />
              <Input
                aria-label="Search episodes"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder={
                  searchFocused || queryText ? 'Search episodes' : 'Search'
                }
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
          {library.error && (
            <div className="status-error" role="alert">
              {library.error.message}
              <Button
                variant="ghost"
                className="cursor-pointer"
                onClick={() => void library.refetch()}
              >
                Try again
              </Button>
            </div>
          )}
          {empty && (
            <LibraryEmptyState
              kind={query ? 'search' : archived ? 'archived' : 'library'}
              onClearSearch={() => setQueryText('')}
            />
          )}
          <div className="episode-list">
            {items.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                selected={activeId === episode.id}
                onSelect={selectEpisode}
                onDeleted={(id) => {
                  if (selectedId === id) setSelectedId(null)
                  if (autoPlayId === id) setAutoPlayId(null)
                }}
              />
            ))}
          </div>
          {library.hasNextPage && (
            <Button
              variant="ghost"
              className="mx-auto mt-4 flex cursor-pointer"
              disabled={library.isFetchingNextPage}
              onClick={() => void library.fetchNextPage()}
            >
              {library.isFetchingNextPage ? 'Loading…' : 'Show more episodes'}
            </Button>
          )}
        </section>
      )}
      {create && (
        <CreateEpisodeDialog
          key={create.topic}
          open
          initialTopic={create.topic}
          onCreated={(episode) => {
            setArchived(false)
            setQueryText('')
            setSelectedId(episode.id)
            setAutoPlayId(episode.id)
            setQueueOpen(true)
            void queryClient.invalidateQueries({
              queryKey: ['podcast-queue', workspaceId],
            })
            void queryClient.invalidateQueries({
              queryKey: ['podcasts', workspaceId],
            })
          }}
          onOpenChange={(open) => {
            if (!open) setCreate(null)
          }}
        />
      )}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
