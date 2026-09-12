import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LANGUAGES, type Language, isRTL } from '../../lib/languages'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface TranslationCard {
  id: string
  title: string
  sourceLanguage: Language
  targetLanguage: Language
  source: string
  translation: string
  truncated: boolean
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const query = useQuery({
    queryKey: [
      'chat-translation',
      new URLSearchParams(location.search).get('cardInput'),
    ],
    queryFn: () => callCardApp<TranslationCard>('scribo', 'scribo.cards.read'),
    refetchInterval: 30_000,
  })
  const card = query.data
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading translation…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {card && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border hover:bg-muted/40 focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook(card.id).catch((error) =>
                  setError(String(error)),
                )
              }}
            >
              <p className="text-muted-foreground text-xs">
                {LANGUAGES[card.sourceLanguage]?.name} →{' '}
                {LANGUAGES[card.targetLanguage]?.name}
              </p>
              <p
                dir={isRTL(card.targetLanguage) ? 'rtl' : 'auto'}
                lang={card.targetLanguage}
                className="mt-2 line-clamp-4 text-base leading-relaxed"
              >
                {card.translation || 'Translation pending'}
              </p>
            </button>
          </div>
          {expanded && (
            <article className="space-y-6 p-5">
              <h1 className="text-lg font-semibold">{card.title}</h1>
              <section>
                <h2 className="text-muted-foreground mb-2 text-xs font-medium">
                  {LANGUAGES[card.sourceLanguage]?.name} · Original
                </h2>
                <p
                  lang={card.sourceLanguage}
                  dir={isRTL(card.sourceLanguage) ? 'rtl' : 'auto'}
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                >
                  {card.source}
                </p>
              </section>
              <section>
                <h2 className="text-muted-foreground mb-2 text-xs font-medium">
                  {LANGUAGES[card.targetLanguage]?.name} · Translation
                </h2>
                <p
                  lang={card.targetLanguage}
                  dir={isRTL(card.targetLanguage) ? 'rtl' : 'auto'}
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                >
                  {card.translation || 'No translation yet.'}
                </p>
              </section>
              {card.truncated && (
                <p className="text-muted-foreground text-xs">
                  This long document continues in Scribo.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
