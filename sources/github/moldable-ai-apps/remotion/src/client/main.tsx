import { StrictMode, Suspense, lazy } from 'react'
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
import { QueryProvider } from '@/lib/query-provider'
import { ChatCard } from './components/chat-card'
import './globals.css'

const App = lazy(() => import('./app'))

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'

installMoldableFrameLifecycle()

installAppChangeNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Remotion">
      <ThemeProvider
        platform={isMobileWeb ? 'ios' : 'macos'}
        platformVersion={isMobileWeb ? '26' : '27'}
      >
        <WorkspaceProvider>
          <QueryProvider>
            {new URLSearchParams(location.search).get('card') === 'preview' ? (
              <ChatCard />
            ) : (
              <AppShell nativeMaterial={{ background: true }} title="Remotion">
                <AppFrameContent scrollable={false} chatSafe={false}>
                  <Suspense
                    fallback={
                      <p
                        role="status"
                        className="text-muted-foreground p-4 text-sm"
                      >
                        Loading Remotion…
                      </p>
                    }
                  >
                    <App />
                  </Suspense>
                </AppFrameContent>
              </AppShell>
            )}
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
