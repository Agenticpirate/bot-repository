'use client'

import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  PanelLeft,
  PanelRight,
} from 'lucide-react'
import {
  AppHeader,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarGroup,
} from '@moldable-ai/ui'

interface HeaderProps {
  projectName: string
  activeFilePath: string | null
  rootPath: string
  isSidebarOpen: boolean
  isBrowserOpen: boolean
  onToggleSidebar: () => void
  onToggleBrowser: () => void
  onBack: () => void
}

export function Header({
  projectName,
  activeFilePath,
  rootPath,
  isSidebarOpen,
  isBrowserOpen,
  onToggleSidebar,
  onToggleBrowser,
  onBack,
}: HeaderProps) {
  // Generate breadcrumbs from active file path
  const breadcrumbs = activeFilePath
    ? activeFilePath.replace(rootPath, '').replace(/^\//, '').split('/')
    : []

  const desktopHeader = (
    <Toolbar position="top" variant="plain" material="none">
      <ToolbarGroup>
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          className="cursor-pointer"
          onClick={onBack}
          title="Back to projects"
          aria-label="Back to projects"
        >
          <ArrowLeft className="size-4" />
        </ToolbarButton>

        {/* Sidebar toggle - Cmd/Ctrl+B */}
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          className="cursor-pointer"
          onClick={onToggleSidebar}
          title={`${isSidebarOpen ? 'Hide' : 'Show'} sidebar (⌘B)`}
        >
          <PanelLeft className="size-4" />
        </ToolbarButton>

        {/* Breadcrumbs */}
        <nav className="text-muted-foreground flex items-center text-xs">
          <span className="text-foreground font-medium">{projectName}</span>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center">
              <ChevronRight className="mx-1 size-3 opacity-40" />
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : ''
                }
              >
                {part}
              </span>
            </span>
          ))}
        </nav>
      </ToolbarGroup>

      {/* Browser toggle - Cmd/Ctrl+Option+B */}
      <ToolbarActions>
        <ToolbarButton
          variant={isBrowserOpen ? 'secondary' : 'ghost'}
          className="inline-flex cursor-pointer items-center gap-1.5 px-2 text-xs"
          onClick={onToggleBrowser}
          title={`${isBrowserOpen ? 'Hide' : 'Show'} browser (⌘⌥B)`}
        >
          <PanelRight className="size-3.5 shrink-0" />
          <span>Browser</span>
        </ToolbarButton>
      </ToolbarActions>
    </Toolbar>
  )

  return (
    <AppHeader
      title={breadcrumbs.at(-1) ?? projectName}
      back={onBack}
      backLabel="Back to projects"
      actions={[
        {
          label: isSidebarOpen ? 'Hide files' : 'Show files',
          icon: FolderOpen,
          onPress: onToggleSidebar,
        },
        {
          label: isBrowserOpen ? 'Hide preview' : 'Show preview',
          icon: PanelRight,
          onPress: onToggleBrowser,
          placement: 'overflow',
        },
      ]}
      desktop={desktopHeader}
    />
  )
}
