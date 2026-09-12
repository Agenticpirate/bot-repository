import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import { ChatCard } from './components/chat-card'
import { Providers, QueryProvider } from '@/components/providers'
import HomePage from './app'
import './globals.css'

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'

installMoldableFrameLifecycle()

installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Time Tracker">
      <ThemeProvider
        platform={isMobileWeb ? 'ios' : 'macos'}
        platformVersion={isMobileWeb ? '26' : '27'}
      >
        <WorkspaceProvider>
          {new URLSearchParams(location.search).get('card') === 'time' ? (
            <QueryProvider>
              <ChatCard />
            </QueryProvider>
          ) : (
            <Providers>
              <HomePage />
            </Providers>
          )}
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
