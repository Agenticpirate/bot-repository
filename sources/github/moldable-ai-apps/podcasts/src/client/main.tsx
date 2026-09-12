import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  AppFrameContent,
  AppFrameTitlebar,
  AppShell,
  DesktopOnly,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { isCard } from './lib/api'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import { ChatCard } from './components/chat-card'
import PodcastsApp from './app'
import './globals.css'
import { QueryProvider } from './query-provider'

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'
installMoldableFrameLifecycle()
installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Podcasts">
      <ThemeProvider
        platform={isMobileWeb ? 'ios' : 'macos'}
        platformVersion={isMobileWeb ? '26' : '27'}
      >
        <WorkspaceProvider>
          <QueryProvider>
            {isCard ? (
              <ChatCard />
            ) : (
              <AppShell title="Podcasts" nativeMaterial={{ background: true }}>
                <DesktopOnly>
                  <AppFrameTitlebar
                    material="none"
                    className="podcasts-window-titlebar border-0"
                    aria-label="Podcasts window title bar"
                  />
                </DesktopOnly>
                <AppFrameContent scrollable>
                  <PodcastsApp />
                </AppFrameContent>
              </AppShell>
            )}
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
