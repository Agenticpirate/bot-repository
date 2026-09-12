import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppErrorBoundary, AppShell, ThemeProvider } from '@moldable-ai/ui'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import {
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from './lib/moldable-ui'
import { ChatCard } from './components/chat-card'
import { App } from './app'
import './globals.css'
import { QueryProvider } from './query-provider'

installMoldableFrameLifecycle()

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'

installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Slides">
      <ThemeProvider
        platform={isMobileWeb ? 'ios' : 'macos'}
        platformVersion={isMobileWeb ? '26' : '27'}
      >
        <WorkspaceProvider>
          <QueryProvider>
            {new URLSearchParams(location.search).get('card') === 'preview' ? (
              <ChatCard />
            ) : (
              <AppShell title="Slides" nativeMaterial={{ background: true }}>
                <App />
              </AppShell>
            )}
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
