import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type AppCommand,
  AppHeader,
  useMoldableAppCommands,
  useMoldableCommands,
} from '@moldable-ai/ui'
import { createApi } from './lib/api'
import {
  isInMoldable,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from './lib/moldable-ui'
import { publishArtifact } from './lib/publish'
import { ArtifactGrid } from './components/artifact-grid'
import type { Artifact, ArtifactKind, ArtifactSummary } from '../shared/types'
import type { ArtifactsUiIntent } from '../shared/ui-intent'

const DeckEditor = lazy(() =>
  import('./components/deck-editor').then((module) => ({
    default: module.DeckEditor,
  })),
)

const PageEditor = lazy(() =>
  import('./components/page-editor').then((module) => ({
    default: module.PageEditor,
  })),
)

const TemplatePicker = lazy(() =>
  import('./components/template-picker').then((module) => ({
    default: module.TemplatePicker,
  })),
)

interface PublishState {
  publishing: boolean
  error?: string | null
}

function summarizeArtifact(artifact: Artifact): ArtifactSummary {
  return {
    id: artifact.id,
    title: artifact.title,
    subtitle: artifact.subtitle,
    kind: artifact.kind,
    templateId: artifact.templateId,
    slideCount: artifact.slides.length,
    published: Boolean(artifact.published),
    publishedUrl: artifact.published?.url ?? null,
    publishPending: Boolean(artifact.publishPending),
    updatedAt: artifact.updatedAt,
    createdAt: artifact.createdAt,
  }
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const api = useMemo(() => createApi(fetchWithWorkspace), [fetchWithWorkspace])

  const [openId, setOpenId] = useState<string | null>(null)
  const [driveIntent, setDriveIntent] = useState<ArtifactsUiIntent | null>(null)
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [publishStates, setPublishStates] = useState<
    Record<string, PublishState>
  >({})
  const inFlight = useRef<Set<string>>(new Set())
  const seenIntentIds = useRef<Set<string>>(new Set())

  const artifactsQuery = useQuery({
    queryKey: ['artifacts', workspaceId],
    queryFn: () => api.listArtifacts(),
    refetchInterval: 4000,
  })

  const artifactQuery = useQuery({
    queryKey: ['artifact', workspaceId, openId],
    queryFn: () => api.getArtifact(openId as string),
    enabled: Boolean(openId),
    refetchInterval: 3000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['artifacts', workspaceId],
    })
    void queryClient.invalidateQueries({ queryKey: ['artifact', workspaceId] })
  }, [queryClient, workspaceId])

  const updateCachedArtifact = useCallback(
    (artifact: Artifact) => {
      queryClient.setQueryData(['artifact', workspaceId, artifact.id], artifact)
      queryClient.setQueryData<ArtifactSummary[]>(
        ['artifacts', workspaceId],
        (current) => {
          if (!current) return current
          const summary = summarizeArtifact(artifact)
          const next = current.some((item) => item.id === artifact.id)
            ? current.map((item) => (item.id === artifact.id ? summary : item))
            : [summary, ...current]
          return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        },
      )
    },
    [queryClient, workspaceId],
  )

  const setPub = useCallback((id: string, state: PublishState) => {
    setPublishStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  const publishOne = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return
      inFlight.current.add(id)
      setPub(id, { publishing: true, error: null })
      try {
        if (!isInMoldable()) {
          throw new Error('Open this artifact inside Moldable to publish.')
        }
        const bundle = await api.stagePublish(id)
        const kind = (bundle.metadata?.artifactKind as string) || 'page'
        const result = await publishArtifact({
          kind,
          title: bundle.title,
          entrypoint: bundle.entrypoint,
          metadata: bundle.metadata,
          files: bundle.files.map((f) => ({
            path: f.path,
            contentType: f.contentType,
            sourcePath: f.sourcePath,
          })),
        })
        await api.publishResult(id, {
          published: {
            url: result.url,
            slug: result.slug,
            version: result.version,
            publishedAt: new Date().toISOString(),
          },
        })
        setPub(id, { publishing: false, error: null })
        return { url: result.url }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Publishing failed.'
        await api.publishResult(id, { error: message }).catch(() => {})
        setPub(id, { publishing: false, error: message })
      } finally {
        inFlight.current.delete(id)
        invalidate()
      }
    },
    [api, invalidate, setPub],
  )

  // Bridge: chat calls the `artifacts.publish` RPC, which flags the artifact as
  // pending. Only the open client iframe can actually publish, so complete it
  // here when we observe the flag.
  useEffect(() => {
    const artifacts = artifactsQuery.data
    if (!artifacts) return
    for (const artifact of artifacts) {
      if (artifact.publishPending && !inFlight.current.has(artifact.id)) {
        void publishOne(artifact.id)
      }
    }
  }, [artifactsQuery.data, publishOne])

  const unpublishOne = useCallback(
    async (id: string) => {
      setPub(id, { publishing: true, error: null })
      try {
        await api.unpublish(id)
        setPub(id, { publishing: false, error: null })
      } catch (error) {
        setPub(id, {
          publishing: false,
          error: error instanceof Error ? error.message : 'Unpublish failed.',
        })
      } finally {
        invalidate()
      }
    },
    [api, invalidate, setPub],
  )

  // Keep the host navigation stack and the in-app toolbar in sync. A host back
  // request has already popped its own entry, so its handler only updates the
  // local view; the toolbar back button explicitly pops before doing the same.
  useEffect(() => {
    resetMoldableNavigation()
  }, [])
  useMoldableNavigationPop(() => setOpenId(null))

  const openArtifact = useCallback((id: string, title: string) => {
    pushMoldableNavigation({
      id: `artifact:${id}`,
      title: title || 'Artifact',
    })
    setOpenId(id)
  }, [])

  const consumeUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as ArtifactsUiIntent | null
    if (!intent || seenIntentIds.current.has(intent.id)) return

    if (intent.view === 'library') {
      resetMoldableNavigation()
      setOpenId(null)
      setDriveIntent(intent)
    } else if (intent.entityId) {
      const artifact = await api.getArtifact(intent.entityId)
      openArtifact(artifact.id, artifact.title)
      setDriveIntent(intent)
    } else {
      // present.next/prev intentionally target the deck already on screen.
      setDriveIntent(intent)
    }

    seenIntentIds.current.add(intent.id)
    await fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    )
  }, [api, fetchWithWorkspace, openArtifact])

  // A1 + A2: invalidate workspace-scoped data and consume the last-wins UI
  // intent immediately. Polling remains as a fallback for ordinary data.
  useEffect(() => {
    void consumeUiIntent()
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        workspaceId?: string
        targetAppId?: string
        method?: string
      }
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'artifacts' || data.workspaceId !== workspaceId)
        return
      if (
        typeof data.method === 'string' &&
        data.method.startsWith('artifacts.')
      ) {
        invalidate()
      }
      void consumeUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [consumeUiIntent, invalidate, workspaceId])

  const closeArtifact = useCallback(() => {
    popMoldableNavigation()
    setOpenId(null)
  }, [])

  const beginNewArtifact = useCallback(() => {
    resetMoldableNavigation()
    setOpenId(null)
    setPicking(true)
  }, [])

  const createArtifact = useCallback(
    async (templateId: string | null, blankKind: ArtifactKind = 'page') => {
      setCreating(true)
      try {
        const artifact = await api.createArtifact(
          templateId ? { templateId } : { kind: blankKind, title: 'Untitled' },
        )
        invalidate()
        setPicking(false)
        openArtifact(artifact.id, artifact.title)
      } finally {
        setCreating(false)
      }
    },
    [api, invalidate, openArtifact],
  )

  const deleteArtifact = useCallback(
    async (id: string) => {
      await api.deleteArtifact(id)
      if (openId === id) closeArtifact()
      invalidate()
    },
    [api, invalidate, openId, closeArtifact],
  )

  const artifacts: ArtifactSummary[] = artifactsQuery.data ?? []
  const currentArtifact: Artifact | undefined = openId
    ? (artifactQuery.data ?? undefined)
    : undefined

  const commandMenuCommands = useMemo<AppCommand[]>(
    () => [
      {
        id: 'artifacts.new',
        label: 'New artifact',
        shortcut: 'n',
        icon: 'plus',
        group: 'Artifacts',
        action: { type: 'message', command: 'artifacts.new', payload: {} },
      },
      ...(currentArtifact?.kind === 'deck'
        ? [
            {
              id: 'artifacts.present',
              label: 'Present deck',
              shortcut: 'p',
              icon: 'play',
              group: 'Artifacts',
              action: {
                type: 'message' as const,
                command: 'artifacts.present',
                payload: {},
              },
            },
          ]
        : []),
    ],
    [currentArtifact?.kind],
  )
  useMoldableAppCommands('artifacts', commandMenuCommands)
  useMoldableCommands({
    'artifacts.new': beginNewArtifact,
    'artifacts.present': () => {
      if (currentArtifact?.kind !== 'deck') return
      setDriveIntent({
        id: `command:${Date.now()}`,
        view: 'presentation',
        entityId: currentArtifact.id,
        createdAt: new Date().toISOString(),
      })
    },
  })

  // The open artifact was deleted out from under us (e.g. via chat): its own
  // fetch 404s.
  useEffect(() => {
    if (openId && artifactQuery.isError) closeArtifact()
  }, [openId, artifactQuery.isError, closeArtifact])

  // Customize the chat system prompt for the current view.
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const context = await import('./lib/chat-context')
        if (!active) return
        const text =
          openId && currentArtifact
            ? await context.artifactChatInstructions(currentArtifact)
            : await context.gridChatInstructions()
        if (!active) return
        window.parent.postMessage(
          { type: 'moldable:set-chat-instructions', text },
          '*',
        )
      } catch {
        // Context enrichment is optional; keep Artifacts usable if a lazy
        // chunk or its backing API is temporarily unavailable.
      }
    })()
    return () => {
      active = false
    }
  }, [openId, currentArtifact])

  useEffect(
    () => () => {
      window.parent.postMessage(
        { type: 'moldable:set-chat-instructions', text: '' },
        '*',
      )
    },
    [],
  )

  if (openId && currentArtifact) {
    const publishState = publishStates[openId] ?? {
      publishing: currentArtifact.publishPending,
    }
    return (
      <>
        <AppHeader
          title={currentArtifact.title}
          back={closeArtifact}
          backLabel="Back to artifacts"
          desktop={false}
        />
        <Suspense fallback={<FullScreenLoading />}>
          {currentArtifact.kind === 'page' ? (
            <PageEditor
              artifact={currentArtifact}
              workspaceId={workspaceId}
              api={api}
              publishState={publishState}
              onBack={closeArtifact}
              onChanged={invalidate}
              onPublish={publishOne}
              onUnpublish={unpublishOne}
            />
          ) : (
            <DeckEditor
              deck={currentArtifact}
              workspaceId={workspaceId}
              driveIntent={driveIntent}
              api={api}
              publishState={publishState}
              onBack={closeArtifact}
              onChanged={invalidate}
              onDeckUpdated={updateCachedArtifact}
              onPublish={publishOne}
              onUnpublish={unpublishOne}
            />
          )}
        </Suspense>
      </>
    )
  }

  return (
    <div className="artifact-library-scroll text-foreground h-full overflow-y-auto bg-transparent">
      <AppHeader
        title="Artifacts"
        desktop={false}
        actions={[
          {
            label: 'New artifact',
            icon: Plus,
            onPress: beginNewArtifact,
          },
        ]}
      />
      <ArtifactGrid
        artifacts={artifacts}
        workspaceId={workspaceId}
        onOpen={openArtifact}
        onNew={beginNewArtifact}
        onDelete={deleteArtifact}
        creating={creating}
        loading={artifactsQuery.isLoading}
      />
      {picking ? (
        <Suspense fallback={null}>
          <TemplatePicker
            title="Start a new artifact"
            confirmLabel="Create"
            allowBlank
            busy={creating}
            onPick={(templateId) => void createArtifact(templateId)}
            onClose={() => setPicking(false)}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

function FullScreenLoading() {
  return <div className="h-full bg-transparent" />
}
