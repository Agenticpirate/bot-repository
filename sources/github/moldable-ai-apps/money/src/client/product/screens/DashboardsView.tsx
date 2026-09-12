import { Check, LayoutDashboard, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
} from '@moldable-ai/ui'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import { DemoBadge } from '../components/ConnectBanner'
import { DashboardGrid } from '../components/DashboardGrid'
import { CategoryEmojiPicker } from '../components/categories/CategoryEmojiPicker'
import { emojiFor } from '../components/dashboardIcon'
import { CardShell } from '../../ui-kit/cards'
import {
  type ResolvedDashboard,
  useDeleteDashboard,
  useUpdateDashboard,
} from '../data-access/hooks'

/**
 * The product home: every dashboard in one continuous scroll. Cross-dashboard
 * navigation (jump, scroll-spy, reorder) lives in the floating {@link TabBar} +
 * {@link DashboardTray}, not a sticky top bar — this view just reports the
 * scroll-spied section up via `onActiveChange` and renders the sections.
 */
export function DashboardsView({
  dashboards,
  isLoading,
  isError,
  demo = false,
  onReorder,
  onAddDashboard,
  onActiveChange,
}: {
  dashboards: ResolvedDashboard[]
  isLoading: boolean
  isError: boolean
  demo?: boolean
  onReorder: (ids: string[]) => void
  onAddDashboard: () => void
  /** Reports the scroll-spied dashboard up so the pill can name it. */
  onActiveChange?: (id: string) => void
}) {
  const [active, setActive] = useState<string | null>(dashboards[0]?.id ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ResolvedDashboard | null>(
    null,
  )
  const updateDashboard = useUpdateDashboard()
  const deleteDashboard = useDeleteDashboard()

  const removeCard = (dash: ResolvedDashboard, cardId: string) =>
    updateDashboard.mutate({
      id: dash.id,
      cardIds: dash.cardIds.filter((id) => id !== cardId),
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    deleteDashboard.mutate(id, {
      onSuccess: () =>
        onReorder(dashboards.map((d) => d.id).filter((x) => x !== id)),
    })
    setEditingId(null)
    setPendingDelete(null)
  }
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const ids = dashboards.map((d) => d.id).join(',')

  // Scroll-spy: report the section sitting under the top of the viewport so the
  // floating Dashboards pill names where you're scrolled to — live, every frame.
  // We use a capturing scroll listener + viewport-relative rects rather than an
  // IntersectionObserver so it tracks correctly regardless of which ancestor
  // element actually scrolls inside the host shell.
  useEffect(() => {
    let raf = 0
    const compute = () => {
      raf = 0
      const els = sectionRefs.current
      if (els.size === 0) return
      // The section whose top most recently crossed above this line is "current";
      // fall back to the topmost section when scrolled above the first header.
      const line = 110
      let activeId: string | null = null
      let bestTop = -Infinity
      let topmostId: string | null = null
      let topmostTop = Infinity
      for (const [id, el] of els) {
        const top = el.getBoundingClientRect().top
        if (top < topmostTop) {
          topmostTop = top
          topmostId = id
        }
        if (top <= line && top > bestTop) {
          bestTop = top
          activeId = id
        }
      }
      setActive(activeId ?? topmostId)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [ids])

  useEffect(() => {
    if (active) onActiveChange?.(active)
  }, [active, onActiveChange])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardShell key={i} title="Loading" state="loading" />
          ))}
        </div>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <CardShell
          title="Dashboards"
          state="error"
          errorMessage="Couldn’t load your dashboards."
        />
      </div>
    )
  }

  if (dashboards.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-24 text-center sm:px-6">
        <span className="bg-muted text-foreground/70 mb-4 flex size-14 items-center justify-center rounded-2xl">
          <LayoutDashboard className="size-7" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">
          No dashboards yet
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Install a ready-made dashboard to see your money at a glance, or ask
          the agent to build one for you.
        </p>
        <button
          type="button"
          onClick={onAddDashboard}
          className="bg-foreground text-background mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Browse dashboards
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-5 sm:px-6">
        <div className="space-y-10">
          {dashboards.map((d) => {
            const editing = editingId === d.id
            return (
              <section
                key={d.id}
                id={`dash-${d.id}`}
                ref={(el) => {
                  if (el) sectionRefs.current.set(d.id, el)
                }}
                className="scroll-mt-4"
              >
                <div className="mb-4 flex items-center gap-2.5">
                  {editing && !demo ? (
                    <CategoryEmojiPicker
                      value={emojiFor(d.id, d.icon)}
                      onChange={(emoji) =>
                        updateDashboard.mutate({ id: d.id, icon: emoji })
                      }
                      ariaLabel={`Choose ${d.name} emoji`}
                      className="-ml-1.5 shrink-0"
                    />
                  ) : (
                    <span
                      className="shrink-0 text-[1.3rem] leading-none"
                      aria-hidden="true"
                    >
                      {emojiFor(d.id, d.icon)}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {editingId === d.id ? (
                      <input
                        defaultValue={d.name}
                        aria-label="Dashboard name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        onBlur={(e) => {
                          const name = e.target.value.trim()
                          if (name && name !== d.name)
                            updateDashboard.mutate({ id: d.id, name })
                        }}
                        className="border-border bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-2 py-0.5 text-lg font-semibold tracking-tight outline-none focus-visible:ring-2"
                      />
                    ) : (
                      <h2 className="truncate text-lg font-semibold tracking-tight">
                        {d.name}
                      </h2>
                    )}
                    {demo ? <DemoBadge /> : null}
                  </div>
                  {!demo ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {editingId === d.id ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(d)}
                          aria-label={`Delete ${d.name} dashboard`}
                          className={cn(
                            'text-muted-foreground hover:text-destructive inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                            FOCUS_RING,
                          )}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId((cur) => (cur === d.id ? null : d.id))
                        }
                        className={cn(
                          'text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                          FOCUS_RING,
                        )}
                      >
                        {editingId === d.id ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                        {editingId === d.id ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  ) : null}
                </div>
                {d.cards.length ? (
                  <DashboardGrid
                    cards={d.cards}
                    enableDrilldown={!demo}
                    onRemoveCard={
                      editingId === d.id
                        ? (cardId) => removeCard(d, cardId)
                        : undefined
                    }
                  />
                ) : (
                  <CardShell
                    title={d.name}
                    state="empty"
                    emptyMessage="No cards on this dashboard yet."
                  />
                )}
              </section>
            )
          })}

          <button
            type="button"
            onClick={onAddDashboard}
            className={cn(
              'border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-5 text-sm font-medium transition-colors',
              FOCUS_RING,
            )}
          >
            <Plus className="size-4" />
            Add a dashboard
          </button>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the dashboard from your list. The underlying cards
              and your data aren’t deleted — you can re-add a dashboard anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
