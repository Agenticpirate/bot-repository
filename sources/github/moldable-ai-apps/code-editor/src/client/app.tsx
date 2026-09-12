'use client'

import { useQueryClient } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppHeader,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { useProject } from '@/hooks/use-project'
import { IDELayout } from '@/components/layout'
import { ProjectSelector } from '@/components/project'

type PendingOpenFile = {
  nonce: number
  projectPath: string
  filePath: string
}

// Host-driven navigation intent queued by the server (drive contract). The
// client polls the single slot, applies the newest unseen intent, and acks it.
type UiIntent = {
  id: string
  view: string
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

function projectTitle(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Project'
}

export default function App() {
  const {
    rootPath,
    recentProjects,
    previewUrl,
    isLoading,
    openProject,
    openFolderPicker,
    closeProject,
    setPreviewUrl,
    saveCurrentProjectTabs,
    getSavedTabs,
  } = useProject()

  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [pendingOpenFile, setPendingOpenFile] =
    useState<PendingOpenFile | null>(null)
  const [pendingIntent, setPendingIntent] = useState<UiIntent | null>(null)
  const seenIntentIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // --- Drive contract: fetch the queued UI intent (single slot, last-wins). ---
  const refreshUiIntent = useCallback(async () => {
    try {
      const res = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!res.ok) return
      const intent = (await res.json()) as UiIntent | null
      if (!intent?.id || seenIntentIds.current.has(intent.id)) return
      setPendingIntent(intent)
    } catch {
      // Best-effort: ignore transient fetch failures.
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    void refreshUiIntent()
  }, [refreshUiIntent])

  // --- Live updates: chat mutations post `moldable:app-api-changed`. Only
  // react to events targeting this app in the active workspace, then refetch
  // the workspace-scoped queries and check for a queued navigation intent. ---
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; targetAppId?: string; workspaceId?: string }
        | null
        | undefined
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'code-editor') return
      if (data.workspaceId !== workspaceId) return
      // Project/preferences plus the file tree and search caches — RPC methods
      // like code-editor.project.set change what every one of these shows.
      void queryClient.invalidateQueries({
        queryKey: ['project-config', workspaceId],
      })
      void queryClient.invalidateQueries({ queryKey: ['files'] })
      void queryClient.invalidateQueries({ queryKey: ['all-files'] })
      void refreshUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, workspaceId, refreshUiIntent])

  // --- Drive contract: apply a queued navigation intent so the UI visibly
  // changes (open the picker, switch projects, open a file tab), then ack. ---
  const applyUiIntent = useCallback(
    (intent: UiIntent) => {
      const params = intent.params ?? {}
      const paramProjectPath =
        typeof params.projectPath === 'string' ? params.projectPath : null

      if (intent.view === 'projects') {
        if (rootPath) popMoldableNavigation()
        void closeProject()
        return
      }

      const targetProject = paramProjectPath ?? rootPath
      if (!targetProject) return // nothing to open — stay on the picker

      if (intent.view === 'file' && typeof intent.entityId === 'string') {
        setPendingOpenFile({
          nonce: Date.now(),
          projectPath: targetProject,
          filePath: intent.entityId,
        })
      }

      if (targetProject !== rootPath) {
        if (rootPath) popMoldableNavigation()
        pushMoldableNavigation({
          id: `project:${targetProject}`,
          title: projectTitle(targetProject),
        })
        void openProject(targetProject)
      }
    },
    [rootPath, closeProject, openProject],
  )

  // Apply once the project config is loaded (so switching projects sticks).
  useEffect(() => {
    if (!pendingIntent || isLoading) return
    const intent = pendingIntent
    seenIntentIds.current.add(intent.id)
    setPendingIntent(null)
    applyUiIntent(intent)
    void fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    ).catch(() => undefined)
  }, [pendingIntent, isLoading, applyUiIntent, fetchWithWorkspace])

  useMoldableNavigationPop(() => {
    void closeProject()
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:open-file') return

      const projectPath =
        typeof event.data.projectPath === 'string'
          ? event.data.projectPath
          : null
      const filePath =
        typeof event.data.filePath === 'string' ? event.data.filePath : null

      if (!projectPath || !filePath) return

      setPendingOpenFile({
        nonce: Date.now(),
        projectPath,
        filePath,
      })

      if (rootPath !== projectPath) {
        if (rootPath) popMoldableNavigation()
        pushMoldableNavigation({
          id: `project:${projectPath}`,
          title: projectTitle(projectPath),
        })
        void openProject(projectPath)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [openProject, rootPath])

  const handleSelectProject = useCallback(
    async (
      path: string,
      currentOpenFiles: string[],
      currentActiveFile: string | null,
    ) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      if (rootPath) popMoldableNavigation()
      pushMoldableNavigation({
        id: `project:${path}`,
        title: projectTitle(path),
      })
      await openProject(path)
    },
    [rootPath, saveCurrentProjectTabs, openProject],
  )

  const handleOpenFolder = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      const path = await openFolderPicker()
      if (!path || path === rootPath) return
      if (rootPath) popMoldableNavigation()
      pushMoldableNavigation({
        id: `project:${path}`,
        title: projectTitle(path),
      })
    },
    [rootPath, saveCurrentProjectTabs, openFolderPicker],
  )

  const handleCloseProject = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      popMoldableNavigation()
      await closeProject()
    },
    [saveCurrentProjectTabs, closeProject],
  )

  const handleTabsChange = useCallback(
    (openFiles: string[], activeFile: string | null) => {
      void saveCurrentProjectTabs(openFiles, activeFile)
    },
    [saveCurrentProjectTabs],
  )

  if (!rootPath) {
    return (
      <div className="h-full w-full">
        <AppHeader
          title="Code"
          desktop={false}
          actions={[
            {
              label: 'Open folder',
              icon: FolderOpen,
              onPress: () => void openFolderPicker(),
            },
          ]}
        />
        <ProjectSelector
          recentProjects={recentProjects}
          isLoading={isLoading}
          onSelectProject={(path) => {
            pushMoldableNavigation({
              id: `project:${path}`,
              title: projectTitle(path),
            })
            void openProject(path)
          }}
          onOpenFolder={async () => {
            const path = await openFolderPicker()
            if (!path) return
            pushMoldableNavigation({
              id: `project:${path}`,
              title: projectTitle(path),
            })
          }}
        />
      </div>
    )
  }

  const savedTabs = getSavedTabs(rootPath)

  return (
    <div className="h-full w-full">
      <IDELayout
        rootPath={rootPath}
        previewUrl={previewUrl}
        savedTabs={savedTabs}
        recentProjects={recentProjects}
        pendingOpenFile={pendingOpenFile}
        onPendingOpenFileDone={(nonce) => {
          setPendingOpenFile((pending) =>
            pending?.nonce === nonce ? null : pending,
          )
        }}
        onSelectProject={handleSelectProject}
        onOpenFolder={handleOpenFolder}
        onCloseProject={handleCloseProject}
        onPreviewUrlChange={setPreviewUrl}
        onTabsChange={handleTabsChange}
      />
    </div>
  )
}
