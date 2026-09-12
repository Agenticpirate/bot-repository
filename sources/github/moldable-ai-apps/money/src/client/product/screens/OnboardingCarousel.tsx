import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, cn } from '@moldable-ai/ui'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import { MiniCard } from '../components/MiniCard'
import { DEMO_DASHBOARD_BY_ID } from '../data-access/demo'
import { PERSONA_DASHBOARDS } from '../personas'

const PREVIEW_CARDS = 6

/**
 * First-run onboarding as a "what should Money help with?" carousel. Each
 * choice installs a real dashboard previewed with sample data; users can pick
 * one or several jobs and connect a bank when they're ready.
 */
export function OnboardingCarousel({
  installed,
  onToggle,
  onContinue,
}: {
  installed: string[]
  onToggle: (id: string) => void
  onContinue: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = PERSONA_DASHBOARDS.length

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  const goTo = useCallback(
    (i: number) => {
      const el = scrollRef.current
      if (!el) return
      const clamped = Math.max(0, Math.min(count - 1, i))
      el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
    },
    [count],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const installedCount = installed.length

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 pt-9 sm:px-6">
        <div className="bg-muted text-muted-foreground mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
          Welcome to Money
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          What should Money help with first?
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base">
          Pick the starting views that match what you care about. You’ll see
          them with sample data now, then connect a bank when you’re ready to go
          live.
        </p>
      </header>

      <div className="relative mt-6 flex-1">
        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label="Dashboard previews — use the left and right arrow keys to browse"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              goTo(active + 1)
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              goTo(active - 1)
            }
          }}
          className="focus-visible:ring-ring flex snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
        >
          {PERSONA_DASHBOARDS.map((persona) => {
            const demo = DEMO_DASHBOARD_BY_ID[persona.id]
            const isInstalled = installed.includes(persona.id)
            return (
              <section key={persona.id} className="w-full shrink-0 snap-center">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                  <div className="border-border/60 bg-card/60 mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-muted flex size-10 items-center justify-center rounded-xl text-xl">
                        {persona.emoji}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight">
                          {persona.name}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          “{persona.audience}”
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isInstalled ? 'outline' : 'default'}
                      onClick={() => onToggle(persona.id)}
                      className="shrink-0"
                    >
                      {isInstalled ? (
                        <>
                          <Check className="size-4" /> Installed
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" /> Add view
                        </>
                      )}
                    </Button>
                  </div>

                  {demo ? (
                    <div className="pointer-events-none grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {demo.cards.slice(0, PREVIEW_CARDS).map((card, i) => (
                        <MiniCard key={`${card.id}-${i}`} card={card} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>

        {/* arrows */}
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous"
          className={cn(
            'border-border/60 bg-card text-muted-foreground hover:text-foreground absolute left-1 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-0 sm:flex',
            FOCUS_RING,
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === count - 1}
          aria-label="Next"
          className={cn(
            'border-border/60 bg-card text-muted-foreground hover:text-foreground absolute right-1 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-0 sm:flex',
            FOCUS_RING,
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* sticky footer */}
      <footer className="border-border/60 bg-background/85 sticky bottom-0 border-t pb-[var(--chat-safe-padding,0px)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5">
            {PERSONA_DASHBOARDS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to ${p.name}`}
                aria-current={i === active}
                className={cn(
                  'relative h-1.5 rounded-full transition-all before:absolute before:-inset-2 before:content-[""]',
                  FOCUS_RING,
                  i === active
                    ? 'bg-foreground w-5'
                    : 'bg-muted-foreground/40 hover:bg-muted-foreground w-1.5',
                )}
              />
            ))}
          </div>
          <Button
            size="lg"
            disabled={installedCount === 0}
            onClick={onContinue}
          >
            {installedCount === 0
              ? 'Choose one to continue'
              : `Continue with ${installedCount} view${installedCount > 1 ? 's' : ''}`}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
