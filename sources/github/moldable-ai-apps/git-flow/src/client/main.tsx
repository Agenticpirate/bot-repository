import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  AppFrameContent,
  AppShell,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import { ChatCard } from './components/chat-card'
import GitFlowPage from './app'
import './globals.css'
import { QueryProvider } from './query-provider'

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'

installMoldableFrameLifecycle()

installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Git">
      <ThemeProvider
        platform={isMobileWeb ? 'ios' : 'macos'}
        platformVersion={isMobileWeb ? '26' : '27'}
      >
        <WorkspaceProvider>
          <QueryProvider>
            {new URLSearchParams(location.search).get('card') === 'preview' ? (
              <ChatCard />
            ) : (
              <AppShell nativeMaterial={{ background: true }} title="Git">
                <AppFrameContent scrollable={false} chatSafe={false}>
                  <GitFlowPage />
                </AppFrameContent>
              </AppShell>
            )}
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
