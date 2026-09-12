import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  AppFrame,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import { ChatCard } from './components/chat-card'
import { App } from './app'
import './globals.css'
import { installMoldableDeliveryLifecycle } from './moldable-delivery-lifecycle'
import { QueryProvider } from './query-provider'

installMoldableFrameLifecycle()
if (!new URLSearchParams(location.search).has('card'))
  installMoldableDeliveryLifecycle()

installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Chess">
      <ThemeProvider
        platform={
          import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true' ? 'ios' : 'macos'
        }
        platformVersion={
          import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true' ? '26' : '27'
        }
      >
        <WorkspaceProvider>
          <QueryProvider>
            {new URLSearchParams(location.search).get('card') === 'game' ? (
              <ChatCard />
            ) : (
              <AppFrame nativeMaterial={{ background: true }}>
                <App />
              </AppFrame>
            )}
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
