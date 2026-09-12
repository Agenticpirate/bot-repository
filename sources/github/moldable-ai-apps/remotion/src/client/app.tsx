import { useQueryClient } from '@tanstack/react-query'
import { Film, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppHeader,
  Toolbar,
  ToolbarButton,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useMoldablePlatform,
  useWorkspace,
} from '@moldable-ai/ui'
import type { RemotionUiIntent } from '@/lib/ui-intent'
import { ProjectEditor } from '@/components/project-editor'
import { ProjectList } from '@/components/project-list'

type AppApiChangedMessage = {
  type: 'moldable:app-api-changed'
  workspaceId?: string
  targetAppId?: string
  method?: string
}

export default function App() {
  const platform = useMoldablePlatform()
  const isMobileWeb = platform === 'mobileWeb'
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const seenUiIntentIdsRef = useRef(new Set<string>())

  const selectProject = useCallback(
    (projectId: string, title?: string) => {
      if (selectedProjectId) popMoldableNavigation()
      if (!projectId) {
        setSelectedProjectId(null)
        return
      }
      pushMoldableNavigation({
        id: `project:${projectId}`,
        title: title || 'Project',
      })
      setSelectedProjectId(projectId)
      if (isMobileWeb) setIsSidebarOpen(false)
    },
    [isMobileWeb, selectedProjectId],
  )

  const refreshUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as RemotionUiIntent | null
    if (!intent || seenUiIntentIdsRef.current.has(intent.id)) return

    if (intent.view === 'projects') {
      resetMoldableNavigation()
      setSelectedProjectId(null)
    } else if (intent.entityId) {
      resetMoldableNavigation()
      pushMoldableNavigation({
        id: `project:${intent.entityId}`,
        title: 'Project',
      })
      setSelectedProjectId(intent.entityId)
    }

    seenUiIntentIdsRef.current.add(intent.id)
    await fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    )
  }, [fetchWithWorkspace])

  useEffect(() => {
    resetMoldableNavigation()
    seenUiIntentIdsRef.current.clear()
    void refreshUiIntent()
  }, [refreshUiIntent, workspaceId])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<AppApiChangedMessage>) => {
      const message = event.data
      if (
        message?.type !== 'moldable:app-api-changed' ||
        message.targetAppId !== 'remotion' ||
        message.workspaceId !== workspaceId
      ) {
        return
      }
      void queryClient.invalidateQueries({
        queryKey: ['projects', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['project', workspaceId],
      })
      void refreshUiIntent()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, refreshUiIntent, workspaceId])

  useMoldableNavigationPop(() => {
    setSelectedProjectId(null)
  })

  return (
    <div className="text-foreground flex h-screen overflow-hidden bg-transparent">
      {!selectedProjectId ? (
        <AppHeader title="Remotion" desktop={false} />
      ) : null}
      <div
        className={`border-border flex-shrink-0 border-r transition-[width,opacity] duration-300 ease-in-out ${
          isSidebarOpen
            ? isMobileWeb
              ? 'w-full opacity-100'
              : 'w-80 opacity-100'
            : 'w-0 overflow-hidden border-r-0 opacity-0'
        }`}
      >
        <div className={isMobileWeb ? 'h-full w-full' : 'h-full w-80'}>
          <ProjectList
            selectedProjectId={selectedProjectId}
            onSelectProject={selectProject}
          />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {selectedProjectId ? (
          <ProjectEditor
            projectId={selectedProjectId}
            sidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
            onBack={() => {
              popMoldableNavigation()
              setSelectedProjectId(null)
              if (isMobileWeb) setIsSidebarOpen(true)
            }}
          />
        ) : (
          <div className="flex h-full flex-col">
            <Toolbar
              position="top"
              variant="plain"
              material="none"
              inset={isSidebarOpen ? 'none' : 'auto'}
              className="min-h-[max(3.25rem,var(--window-titlebar-height,0px))]"
            >
              <ToolbarButton
                material="ultra-thin"
                size="icon-xl"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setIsSidebarOpen((open) => !open)}
                title={
                  isSidebarOpen ? 'Hide projects list' : 'Show projects list'
                }
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="size-5" />
                ) : (
                  <PanelLeftOpen className="size-5" />
                )}
              </ToolbarButton>
            </Toolbar>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <div className="bg-muted/50 rounded-full p-6">
                <Film className="text-muted-foreground h-12 w-12" />
              </div>
              <h2 className="text-foreground mt-4 text-xl font-semibold">
                Select a Project
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-center">
                Choose a project from the sidebar or create a new one to start
                editing your Remotion compositions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
