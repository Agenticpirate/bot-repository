import { StrictMode } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  type AppErrorSource,
  AppFrameContent,
  AppShell,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { installAppChangeNotifications } from './lib/app-change-notifications'
import { ChatCard } from './components/chat-card'
import './globals.css'
import { installMoldableDeliveryLifecycle } from './moldable-delivery-lifecycle'
import { QueryProvider } from './query-provider'

const isMobileWeb = import.meta.env.VITE_MOLDABLE_MOBILE_WEB === 'true'

installMoldableFrameLifecycle()
installMoldableDeliveryLifecycle()

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

function renderError(root: Root, error: unknown, source: AppErrorSource) {
  root.render(
    <StrictMode>
      <AppErrorBoundary
        appName="Reader"
        initialError={toError(error)}
        initialSource={source}
      >
        <div />
      </AppErrorBoundary>
    </StrictMode>,
  )
}

async function startReader() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Reader could not find the #root element.')
  }

  installAppChangeNotifications()

  const root = createRoot(rootElement)

  try {
    const { App } = await import('./app')

    root.render(
      <StrictMode>
        <AppErrorBoundary appName="Reader">
          <ThemeProvider
            platform={isMobileWeb ? 'ios' : 'macos'}
            platformVersion={isMobileWeb ? '26' : '27'}
          >
            <WorkspaceProvider>
              <QueryProvider>
                {new URLSearchParams(location.search).get('card') === 'book' ? (
                  <ChatCard />
                ) : (
                  <AppShell
                    nativeMaterial={{ background: true }}
                    title="Reader"
                  >
                    <AppFrameContent scrollable={false} chatSafe={false}>
                      <App />
                    </AppFrameContent>
                  </AppShell>
                )}
              </QueryProvider>
            </WorkspaceProvider>
          </ThemeProvider>
        </AppErrorBoundary>
      </StrictMode>,
    )
  } catch (error) {
    console.error('Reader failed to start:', error)
    renderError(root, error, 'bootstrap')
  }
}

void startReader().catch((error) => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('Reader failed before #root was available:', error)
    return
  }
  renderError(createRoot(rootElement), error, 'bootstrap')
})
