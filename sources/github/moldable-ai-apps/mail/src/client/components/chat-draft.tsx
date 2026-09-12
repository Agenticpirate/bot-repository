import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@moldable-ai/ui'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { ComposerState, MailDraft } from '../types'
import { Composer } from './composer'

type DraftResult =
  | { state: 'draft'; draft: MailDraft; revision: string; accountId: string }
  | { state: 'sent' | 'uncertain' | 'attachments'; messageId?: string }

export function ChatDraft() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [result, setResult] = useState<DraftResult>()
  const [composer, setComposer] = useState<ComposerState>()
  const [error, setError] = useState<unknown>()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const pending = useRef(false)
  const dirty = useRef(false)
  const editGeneration = useRef(0)
  const readGeneration = useRef(0)
  const accept = useCallback((result: DraftResult) => {
    dirty.current = false
    setResult(result)
    if (result.state === 'draft') setComposer(result.draft.composer)
  }, [])
  const refresh = useCallback(
    async (explicit = false) => {
      if (pending.current) return
      const request = ++readGeneration.current
      const edits = editGeneration.current
      const current = await callCardApp<DraftResult>('mail', 'mail.cards.read')
      if (request !== readGeneration.current || pending.current) return
      // Reconnect and other clients can finalize the draft. Never overwrite local
      // edits with a passive read or a read that raced typing or a save/send.
      if (
        current.state !== 'draft' ||
        (edits === editGeneration.current && (explicit || !dirty.current))
      )
        accept(current)
    },
    [accept],
  )
  useEffect(() => {
    const reload = () => {
      void refresh().catch(setError)
    }
    reload()
    const timer = window.setInterval(reload, 30_000)
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    window.addEventListener('moldable:card-invalidated', reload)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', reload)
      window.removeEventListener('online', reload)
      window.removeEventListener('moldable:card-invalidated', reload)
      readGeneration.current += 1
    }
  }, [refresh])
  const submit = async (operation: 'save' | 'send') => {
    if (pending.current || !composer || result?.state !== 'draft') return
    readGeneration.current += 1
    pending.current = true
    setBusy(true)
    setError(undefined)
    setSaved(false)
    try {
      const next = await callCardApp<DraftResult>(
        'mail',
        `mail.cards.${operation}`,
        {
          expectedRevision: result.revision,
          to: composer.to,
          cc: composer.cc,
          bcc: composer.bcc,
          subject: composer.subject,
          body: composer.body,
        },
      )
      accept(next)
      setSaved(operation === 'save' && next.state === 'draft')
    } catch (error) {
      setError(error)
      // Keep edited fields on a conflict. Re-reading a sent/uncertain receipt
      // removes the send button after a lost acknowledgement.
      try {
        const current = await callCardApp<DraftResult>(
          'mail',
          'mail.cards.read',
        )
        if (current.state !== 'draft') accept(current)
      } catch {
        /* Keep the editable recovery state. */
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const terminal =
    result?.state === 'sent'
      ? 'Email sent.'
      : result?.state === 'uncertain'
        ? 'The send result could not be confirmed. Check Sent in Mail before trying again.'
        : result?.state === 'attachments'
          ? 'This draft has attachments. Open Mail to inspect the original draft.'
          : undefined
  const draftId = result?.state === 'draft' ? result.draft.id : undefined
  return (
    <div ref={contentRef} className="bg-background">
      <div hidden={expanded}>
        <button
          type="button"
          className="border-border hover:bg-muted/40 focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
          onClick={() => {
            void openQuickLook(draftId).catch(setError)
          }}
        >
          <p className="text-muted-foreground truncate text-xs">
            {terminal ||
              (composer?.to ? `Draft to ${composer.to}` : 'Email draft')}
          </p>
          <p className="mt-1 truncate text-sm font-medium">
            {composer?.subject ||
              (result ? 'Untitled draft' : 'Loading draft…')}
          </p>
          {composer?.body && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {composer.body}
            </p>
          )}
        </button>
        {Boolean(error) && (
          <p role="alert" className="text-destructive px-4 py-2 text-sm">
            {error instanceof Error
              ? error.message
              : 'Could not load the draft.'}
          </p>
        )}
      </div>
      <div hidden={!expanded}>
        {terminal ? (
          <p role="status" className="text-muted-foreground p-5 text-sm">
            {terminal}
          </p>
        ) : (
          <div className="flex min-h-[32rem] flex-col">
            <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2">
              <span role="status" className="text-muted-foreground text-xs">
                {saved
                  ? 'Draft saved'
                  : 'Changes stay here until you save or send.'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => {
                  setError(undefined)
                  void refresh(true).catch(setError)
                }}
              >
                Refresh
              </Button>
            </div>
            {composer ? (
              <div className="min-h-0 flex-1">
                <Composer
                  inline
                  composer={composer}
                  contacts={[]}
                  error={error}
                  sending={busy}
                  onChange={(value) => {
                    dirty.current = true
                    editGeneration.current += 1
                    setComposer(value)
                    setSaved(false)
                  }}
                  onContactSearch={() => {}}
                  onClose={() => {
                    void submit('save')
                  }}
                  onSubmit={() => {
                    void submit('send')
                  }}
                />
              </div>
            ) : (
              <p
                role={error ? 'alert' : 'status'}
                className="text-muted-foreground p-4 text-sm"
              >
                {error
                  ? error instanceof Error
                    ? error.message
                    : 'Could not load the draft.'
                  : 'Loading draft…'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
