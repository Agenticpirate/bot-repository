import { ArrowRight, Check, Plus, Sparkles } from 'lucide-react'
import { Button, cn } from '@moldable-ai/ui'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import { PERSONA_DASHBOARDS } from '../personas'

/**
 * The compact "Add a dashboard" surface, shown when reopening the dashboard
 * picker after first-run. Unlike the first-run {@link OnboardingCarousel} (which
 * pages through full previews so a new user can "see themselves"), this is a
 * dense list: the ready-made dashboards with their install state, plus a
 * "Create with chat" card that hands the agent a starter prompt. Installing an
 * already-installed set should never mean swiping through four big previews
 * again — here they just read as "Installed".
 */
export function AddDashboardView({
  installedIds,
  onInstall,
  onCreateWithChat,
  onDone,
}: {
  installedIds: string[]
  onInstall: (id: string) => void
  onCreateWithChat: () => void
  onDone: () => void
}) {
  const installed = new Set(installedIds)
  const allInstalled = PERSONA_DASHBOARDS.every((p) => installed.has(p.id))

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 pt-9 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Add a dashboard
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base">
          {allInstalled
            ? 'You’ve installed every ready-made dashboard. Describe your own and the agent will build it.'
            : 'Install a ready-made dashboard, or describe your own and the agent will build it.'}
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={onCreateWithChat}
          className={cn(
            'border-[var(--chart-1)]/40 bg-[var(--chart-1)]/5 hover:bg-[var(--chart-1)]/10 group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
            FOCUS_RING,
          )}
        >
          <span className="bg-[var(--chart-1)]/15 flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--chart-1)]">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tracking-tight">
              Create with chat
            </span>
            <span className="text-muted-foreground block text-sm">
              Describe what you want to track and the agent builds a custom
              dashboard for you.
            </span>
          </span>
          <ArrowRight className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 transition-colors" />
        </button>

        <p className="text-muted-foreground mb-2 mt-7 text-[11px] font-medium uppercase tracking-wide">
          Ready-made dashboards
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PERSONA_DASHBOARDS.map((persona) => {
            const isInstalled = installed.has(persona.id)
            return (
              <div
                key={persona.id}
                className="border-border/60 bg-card/60 flex items-center gap-3 rounded-2xl border p-3.5"
              >
                <span
                  className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  aria-hidden="true"
                >
                  {persona.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium tracking-tight">
                    {persona.name}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {persona.audience}
                  </div>
                </div>
                {isInstalled ? (
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium">
                    <Check className="size-3.5" />
                    Installed
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onInstall(persona.id)}
                    className="shrink-0"
                  >
                    <Plus className="size-3.5" />
                    Install
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <footer className="border-border/60 bg-background/85 sticky bottom-0 border-t pb-[var(--chat-safe-padding,0px)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-end px-4 py-3 sm:px-6">
          <Button size="lg" onClick={onDone}>
            Done
          </Button>
        </div>
      </footer>
    </div>
  )
}
