import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendToMoldable, useTheme } from '@moldable-ai/ui'

/** Presentation only. Data and mutations continue through the existing app RPC. */
export function useCardSurface(preferredWidth = 480) {
  const { setTheme } = useTheme()
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent && event.source !== window) return
      if (
        event.data?.type === 'moldable:card-theme' &&
        (event.data.theme === 'dark' || event.data.theme === 'light')
      )
        setTheme(event.data.theme)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [setTheme])
  const queryClient = useQueryClient()
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent && event.source !== window) return
      if (event.data?.type === 'moldable:card-refresh') {
        void queryClient.invalidateQueries()
        window.dispatchEvent(new Event('moldable:card-invalidated'))
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [queryClient])
  const contentRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    for (const element of [
      document.documentElement,
      document.body,
      document.getElementById('root'),
    ]) {
      if (element) {
        element.style.minHeight = '0'
        element.style.height = 'auto'
        element.style.overflow = 'visible'
      }
    }
    // Compact height is owned by the host. A document scrollbar would change
    // text wrapping while that height settles and can create a resize loop.
    const setDocumentScrolling = (open: boolean) => {
      document.documentElement.style.overflowX = 'hidden'
      document.documentElement.style.overflowY = open ? 'auto' : 'hidden'
    }
    setDocumentScrolling(false)
    // Cards measure their own layout, independently of the iframe viewport.
    // Block layout also avoids the anonymous baseline gap below compact buttons.
    content.style.display = 'flow-root'
    const style = document.createElement('style')
    content.dataset.moldableCardRoot = ''
    style.textContent =
      'html, body, #root { background: transparent !important; } [data-moldable-card-root] { --background: var(--card); color: var(--card-foreground); } [data-moldable-card-root] > div > button { display: block; }'
    document.head.append(style)
    let frame = 0
    let lastHeight = 0
    let layoutHeight: number | undefined
    let isExpanded = false
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (isExpanded) return
        const height = Math.ceil(layoutHeight ?? content.offsetHeight)
        if (height > 0 && height <= 100_000 && height !== lastHeight) {
          lastHeight = height
          sendToMoldable({
            type: 'moldable:card-size',
            height,
            width: preferredWidth,
          })
        }
      })
    }
    const observer = new ResizeObserver((entries) => {
      layoutHeight = entries[0]?.borderBoxSize?.[0]?.blockSize
      measure()
    })
    observer.observe(content)
    measure()
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent && event.source !== window) return
      if (event.data?.type === 'moldable:card-view-state') {
        isExpanded = event.data.view === 'open'
        setDocumentScrolling(isExpanded)
        if (!isExpanded) {
          lastHeight = 0
          layoutHeight = undefined
          setExpanded(false)
          measure()
        }
      }
    }
    window.addEventListener('message', receive)
    return () => {
      observer.disconnect()
      style.remove()
      cancelAnimationFrame(frame)
      window.removeEventListener('message', receive)
    }
  }, [preferredWidth])
  const openQuickLook = useCallback(
    (itemId?: string) =>
      new Promise<void>((resolve, reject) => {
        const requestId = `card-view-${crypto.randomUUID()}`
        const timer = window.setTimeout(() => {
          window.removeEventListener('message', receive)
          reject(new Error('Could not open this view. Please try again.'))
        }, 30_000)
        const receive = (event: MessageEvent) => {
          if (event.source !== window.parent && event.source !== window) return
          if (
            event.data?.type !== 'moldable:card-view-result' ||
            event.data.requestId !== requestId
          )
            return
          clearTimeout(timer)
          window.removeEventListener('message', receive)
          if (event.data.ok === true) {
            setExpanded(true)
            resolve()
          } else
            reject(
              new Error(
                typeof event.data.error === 'string'
                  ? event.data.error
                  : 'Could not open this view.',
              ),
            )
        }
        window.addEventListener('message', receive)
        sendToMoldable({
          type: 'moldable:card-view',
          requestId,
          view: 'open',
          ...(itemId ? { itemId } : {}),
        })
      }),
    [],
  )
  return { contentRef, expanded, openQuickLook }
}
