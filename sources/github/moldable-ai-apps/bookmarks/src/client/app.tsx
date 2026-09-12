import { RefreshCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Toolbar,
  ToolbarActions,
  ToolbarIconButton,
  cn,
} from '@moldable-ai/ui'
import { syncProgressLabel } from './lib/sync-progress'
import {
  useBookmarks,
  useBookmarksStatus,
  useDisconnectBookmarks,
  useSyncBookmarks,
  useUpdateFolderSelection,
} from './hooks/use-bookmarks'
import { BookmarkList } from './components/bookmark-list'
import { CategorySettings } from './components/category-settings'
import { ConnectScreen } from './components/connect-screen'

export function App() {
  const status = useBookmarksStatus()
  const [query, setQuery] = useState('')
  const [folderId, setFolderId] = useState<string>()
  const bookmarks = useBookmarks(
    query,
    folderId,
    status.data?.sync.status === 'syncing',
  )
  const sync = useSyncBookmarks()
  const disconnect = useDisconnectBookmarks()
  const updateFolderSelection = useUpdateFolderSelection()
  const refetchBookmarks = bookmarks.refetch

  useEffect(() => {
    if (status.data?.sync.lastSyncAt) void refetchBookmarks()
  }, [refetchBookmarks, status.data?.sync.lastSyncAt])

  if (status.isPending) return <LoadingScreen />
  if (status.isError) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent p-6 text-center">
        <div>
          <p className="font-medium">Bookmarks couldn’t start</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {status.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => void status.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }
  if (!status.data.connected) {
    return (
      <ConnectScreen
        profiles={status.data.profiles}
        loadingProfiles={status.isFetching}
        onRescan={() => void status.refetch()}
      />
    )
  }

  const syncing = status.data.sync.status === 'syncing'
  const retryAt = status.data.sync.retryAt
    ? Date.parse(status.data.sync.retryAt)
    : 0
  const coolingDown = Number.isFinite(retryAt) && retryAt > Date.now()
  const refresh = () => {
    if (!coolingDown) sync.mutate({})
  }
  const progress = syncing
    ? syncProgressLabel(status.data.sync.phase)
    : undefined
  const selectedFolders = status.data.folders.filter(
    (folder) => folder.selected,
  )
  const changeFolderSelection = (selectedFolderIds: string[]) => {
    if (folderId && !selectedFolderIds.includes(folderId)) {
      setFolderId(undefined)
    }
    updateFolderSelection.mutate({ selectedFolderIds })
  }

  return (
    <div className="text-foreground flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <Toolbar
        position="top"
        variant="plain"
        material="none"
        className="shrink-0 border-0"
      >
        <ToolbarActions>
          <div className="relative w-[min(14rem,34vw)] shrink-0">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-muted/50 placeholder:text-muted-foreground/70 h-7 rounded-full border-transparent pl-8 pr-3 text-[12px] shadow-none"
              placeholder="Search bookmarks"
              aria-label="Search bookmarks"
            />
          </div>
          <CategorySettings
            folders={status.data.folders}
            saving={updateFolderSelection.isPending}
            onChange={changeFolderSelection}
            onDisconnect={() => disconnect.mutate({})}
            disconnecting={disconnect.isPending}
          />
          <ToolbarIconButton
            className="cursor-pointer"
            label="Refresh bookmarks"
            disabled={syncing || sync.isPending || coolingDown}
            onClick={refresh}
          >
            <RefreshCcw className={cn(syncing && 'animate-spin')} />
          </ToolbarIconButton>
        </ToolbarActions>
      </Toolbar>

      <div className="shrink-0 px-5 pb-2 pt-1">
        <div className="w-full">
          {selectedFolders.length ? (
            <nav
              className="mt-1 flex gap-1 overflow-x-auto pb-1"
              aria-label="Bookmark folders"
            >
              <FolderChip
                active={!folderId}
                label="All"
                onClick={() => setFolderId(undefined)}
              />
              {selectedFolders.map((folder) => (
                <FolderChip
                  key={folder.id}
                  active={folder.id === folderId}
                  label={folder.name}
                  onClick={() => setFolderId(folder.id)}
                />
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
        <div className="w-full space-y-4 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
          {status.data.sync.status === 'error' ? (
            <div
              className={cn(
                'rounded-xl border px-4 py-2 text-xs font-medium',
                coolingDown
                  ? 'border-warning/30 bg-warning/10 text-foreground'
                  : 'border-destructive/30 bg-destructive/10 text-destructive',
              )}
            >
              {coolingDown
                ? `X hit a temporary rate limit. Sync will resume automatically ${relativeRetryTime(retryAt)}.`
                : (status.data.sync.lastError ?? 'Couldn’t refresh bookmarks.')}
            </div>
          ) : null}
          <BookmarkList
            items={bookmarks.data?.items ?? []}
            loading={bookmarks.isPending}
            query={query}
            refreshing={syncing || sync.isPending}
            coolingDown={coolingDown}
            syncProgress={progress}
            onRefresh={refresh}
          />
        </div>
      </main>
    </div>
  )
}

interface FolderChipProps {
  active: boolean
  label: string
  onClick: () => void
}

function FolderChip({ active, label, onClick }: FolderChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-7 shrink-0 cursor-pointer items-center rounded-full px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      onClick={onClick}
    >
      <span>{label}</span>
    </button>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center bg-transparent">
      <RefreshCcw className="text-muted-foreground size-4 animate-spin" />
    </div>
  )
}

function relativeRetryTime(retryAt: number): string {
  const minutes = Math.max(1, Math.ceil((retryAt - Date.now()) / 60_000))
  return `in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}
