import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import {
  type MailResourceTarget,
  loadMailDraftResource,
  loadMailResource,
  mailResourceFromMessage,
  mailResourceFromSearch,
} from '../lib/mail-resource-navigation'
import type { MailDraft, MailMessageDetail } from '../types'

/** Observer-local navigation. The source app resolves the exact resource through
 * its ordinary workspace/account API, even when it is outside the loaded inbox. */
export function useMailResourceNavigation({
  enabled,
  onOpen,
  onOpenDraft,
}: {
  enabled: boolean
  onOpen: (message: MailMessageDetail) => void
  onOpenDraft: (draft: MailDraft) => void
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [pending, setPending] = useState<{
    workspaceId: string
    target: MailResourceTarget
  } | null>(() => {
    const target = mailResourceFromSearch(window.location.search)
    return target ? { workspaceId, target } : null
  })
  const [result, setResult] = useState<{
    workspaceId: string
    message?: MailMessageDetail
    error?: string
  } | null>(null)
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const onOpenDraftRef = useRef(onOpenDraft)
  onOpenDraftRef.current = onOpenDraft

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source &&
        event.source !== window.parent &&
        event.source !== window
      )
        return
      const target = mailResourceFromMessage(event.data, workspaceId)
      if (target) {
        setResult(null)
        setPending({ workspaceId, target })
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [workspaceId])

  useEffect(() => {
    if (!pending || !enabled || pending.workspaceId !== workspaceId) return
    let canceled = false
    const load = async () =>
      pending.target.resourceType === 'mail.draft'
        ? {
            draft: await loadMailDraftResource(
              pending.target,
              fetchWithWorkspace,
            ),
          }
        : {
            message: await loadMailResource(pending.target, fetchWithWorkspace),
          }
    void load()
      .then((loaded) => {
        if (canceled) return
        if (window.location.search.includes('moldableResource=')) {
          try {
            const url = new URL(window.location.href)
            url.searchParams.delete('moldableResource')
            window.history.replaceState(window.history.state, '', url)
          } catch {
            // Custom-scheme webviews may restrict history changes. The resolved
            // email should still open when removing the startup hint is denied.
          }
        }
        if ('message' in loaded && loaded.message) {
          setResult({ workspaceId, message: loaded.message })
          onOpenRef.current(loaded.message)
        } else if ('draft' in loaded && loaded.draft) {
          setResult({ workspaceId })
          onOpenDraftRef.current(loaded.draft)
        }
        setPending(null)
      })
      .catch((error: unknown) => {
        if (canceled) return
        setResult({
          workspaceId,
          error:
            error instanceof Error
              ? error.message
              : 'Could not open this email.',
        })
        setPending(null)
      })
    return () => {
      canceled = true
    }
  }, [enabled, fetchWithWorkspace, pending, workspaceId])

  return {
    message: result?.workspaceId === workspaceId ? result.message : undefined,
    error: result?.workspaceId === workspaceId ? result.error : undefined,
    loading: pending?.workspaceId === workspaceId,
    dismissError: useCallback(() => setResult(null), []),
  }
}
