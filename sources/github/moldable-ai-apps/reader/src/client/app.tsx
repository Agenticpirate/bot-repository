import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  popMoldableNavigation,
  pushMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { LibraryView } from './components/library-view'
import { ReaderView } from './components/reader-view'
import type { ReaderUiIntent } from '../shared/ui-intent'

type View =
  | { kind: 'library' }
  | {
      kind: 'reader'
      bookId: string
      navigationId?: string
      navigationCursor?: {
        chapterIndex: number
        wordIndex: number
      }
      navigationPageIndex?: number
    }

type AppApiChangedMessage = {
  type: 'moldable:app-api-changed'
  workspaceId?: string
  targetAppId?: string
  method?: string
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>({ kind: 'library' })
  const [pendingUiIntent, setPendingUiIntent] = useState<ReaderUiIntent | null>(
    null,
  )
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const navEntryRef = useRef<string | null>(null)
  const seenIntentIdsRef = useRef(new Set<string>())
  const intentRefreshGenerationRef = useRef(0)

  const openBook = useCallback(
    (
      bookId: string,
      title = 'Reading',
      navigationId?: string,
      navigationCursor?: { chapterIndex: number; wordIndex: number },
      navigationPageIndex?: number,
    ) => {
      if (navEntryRef.current) {
        popMoldableNavigation(navEntryRef.current)
        navEntryRef.current = null
      }
      setView({
        kind: 'reader',
        bookId,
        navigationId,
        navigationCursor,
        navigationPageIndex,
      })
      const id = pushMoldableNavigation({
        id: `book:${bookId}`,
        title,
      }) as unknown
      navEntryRef.current = typeof id === 'string' ? id : null
    },
    [],
  )

  const closeBook = useCallback((fromHost = false) => {
    setView({ kind: 'library' })
    if (!fromHost && navEntryRef.current) {
      popMoldableNavigation(navEntryRef.current)
    }
    navEntryRef.current = null
  }, [])

  const openFolder = useCallback((folderId: string, title: string) => {
    pushMoldableNavigation({ id: `folder:${folderId}`, title })
    setActiveFolderId(folderId)
  }, [])

  const closeFolder = useCallback((fromHost = false) => {
    if (!fromHost) popMoldableNavigation()
    setActiveFolderId(null)
  }, [])

  // Host back button.
  useMoldableNavigationPop(() => {
    if (view.kind === 'reader') closeBook(true)
    else if (activeFolderId) closeFolder(true)
  })

  // Deep link: /?book=<id> opens a book directly (used by the Today resume rail).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookId = params.get('book')
    if (bookId) openBook(bookId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshUiIntent = useCallback(async () => {
    const refreshGeneration = ++intentRefreshGenerationRef.current
    const response = await fetchWithWorkspace(
      '/api/moldable/ui-intent/consume',
      { method: 'POST' },
    )
    if (!response.ok) return
    const intent = (await response.json()) as ReaderUiIntent | null
    if (refreshGeneration !== intentRefreshGenerationRef.current) return
    if (!intent || seenIntentIdsRef.current.has(intent.id)) return

    seenIntentIdsRef.current.add(intent.id)
    setPendingUiIntent(intent)
    if (intent.view === 'library') {
      closeBook(false)
    } else if (intent.entityId) {
      const chapterIndex = intent.params?.chapterIndex
      const wordIndex = intent.params?.wordIndex
      const pageIndex = intent.params?.pageIndex
      const navigationCursor =
        typeof chapterIndex === 'number' && typeof wordIndex === 'number'
          ? { chapterIndex, wordIndex }
          : undefined
      const navigationPageIndex =
        typeof pageIndex === 'number' && pageIndex >= 0 ? pageIndex : undefined
      openBook(
        intent.entityId,
        'Reading',
        intent.id,
        navigationCursor,
        navigationPageIndex,
      )
    }
  }, [closeBook, fetchWithWorkspace, openBook])

  // Drive contract: consume a queued intent on mount/workspace change.
  useEffect(() => {
    seenIntentIdsRef.current.clear()
    setPendingUiIntent(null)
    void refreshUiIntent()
  }, [refreshUiIntent, workspaceId])

  // A consumed intent is replayable desired state. Acknowledge it only after
  // React has committed the matching view, so renderer transfer or a crash
  // cannot strand a newly presented frame on the library.
  useEffect(() => {
    if (!pendingUiIntent) return
    const matchesCommittedView =
      pendingUiIntent.view === 'library'
        ? view.kind === 'library'
        : view.kind === 'reader' &&
          view.navigationId === pendingUiIntent.id &&
          view.bookId === pendingUiIntent.entityId
    if (!matchesCommittedView) return

    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetchWithWorkspace(
          '/api/moldable/ui-intent/ack',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intentId: pendingUiIntent.id }),
            signal: controller.signal,
          },
        )
        if (!response.ok) return
        const result = (await response.json()) as {
          acknowledged?: boolean
        }
        if (!result.acknowledged) return
        setPendingUiIntent((current) =>
          current?.id === pendingUiIntent.id ? null : current,
        )
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Reader could not acknowledge its UI intent', error)
        }
      }
    })()

    return () => controller.abort()
  }, [fetchWithWorkspace, pendingUiIntent, view])

  // Drive contract: poll the replayable desired state as a fallback for RPC
  // callers that are not brokered through the desktop change notification.
  // This keeps an already-open Reader synchronized when a voice continuation
  // advances the persisted cursor.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshUiIntent()
    }, 200)
    return () => window.clearInterval(interval)
  }, [refreshUiIntent])

  // Drive contract: react immediately to brokered App API changes.
  useEffect(() => {
    const handleMessage = (event: MessageEvent<AppApiChangedMessage>) => {
      const message = event.data
      if (
        message?.type !== 'moldable:app-api-changed' ||
        message.targetAppId !== 'reader' ||
        message.workspaceId !== workspaceId
      ) {
        return
      }

      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(workspaceId),
      })
      void refreshUiIntent()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, refreshUiIntent, workspaceId])

  // Keep fixed reader controls aligned with the *current* desktop chat state.
  // The generic --chat-safe-padding can be conservative; Mail uses this host
  // event for bottom docks so minimized chat does not leave a large dead zone.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:chat-state') return
      const safePadding = Number(event.data.safePadding)
      if (!Number.isFinite(safePadding)) return
      const isChatHidden = safePadding <= 0
      document.documentElement.style.setProperty(
        '--reader-control-safe-padding',
        `${Math.max(0, safePadding)}px`,
      )
      document.documentElement.style.setProperty(
        '--reader-page-bottom-gutter',
        isChatHidden ? '1rem' : '4rem',
      )
      document.documentElement.style.setProperty(
        '--reader-speed-control-bottom-gutter',
        isChatHidden ? '1rem' : '1.75rem',
      )
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="bg-background text-foreground h-full min-h-0 overflow-hidden">
      {view.kind === 'library' ? (
        <LibraryView
          activeFolderId={activeFolderId}
          onCloseFolder={closeFolder}
          onOpenBook={openBook}
          onOpenFolder={openFolder}
        />
      ) : (
        <ReaderView
          key={`${view.bookId}:${view.navigationId ?? 'local'}`}
          bookId={view.bookId}
          navigationId={view.navigationId}
          navigationCursor={view.navigationCursor}
          navigationPageIndex={view.navigationPageIndex}
          onClose={() => closeBook(false)}
        />
      )}
    </div>
  )
}
