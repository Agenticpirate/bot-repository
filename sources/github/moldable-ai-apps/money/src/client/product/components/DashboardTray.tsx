import { GripVertical, Plus } from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@moldable-ai/ui'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import { emojiFor } from './dashboardIcon'

export type TrayDashboard = { id: string; name: string; icon?: string }

/**
 * The dashboards "table of contents" — a tray that floats just above the
 * Dashboards tab in the {@link TabBar}. It replaces the old sticky top pill
 * rail: list every dashboard (tap to jump, driven by the same scroll-spy that
 * names the pill), drag the grip (or arrow-key it) to reorder — first is your
 * default — and add a new dashboard. Stays mounted while on Dashboards and
 * animates open/closed via `open`, so motion matches the rest of the shell.
 */
export function DashboardTray({
  dashboards,
  activeId,
  open,
  onClose,
  onJump,
  onReorder,
  onAdd,
}: {
  dashboards: TrayDashboard[]
  activeId: string | null
  open: boolean
  onClose: () => void
  onJump: (id: string) => void
  onReorder: (ids: string[]) => void
  onAdd: () => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map())
  const drag = useRef<{ id: string; pointerId: number } | null>(null)

  // Close on Escape while open (click-the-scrim is the pointer equivalent).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const rowAtY = (y: number): string | null => {
    for (const [id, el] of rowRefs.current) {
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  // Vertical sibling of the pill-rail drag: only swap once the pointer crosses
  // the target row's midpoint in the travel direction, so neighbours don't
  // oscillate under the cursor.
  const reorderDuringDrag = useCallback(
    (draggedId: string, clientY: number) => {
      const targetId = rowAtY(clientY)
      if (!targetId || targetId === draggedId) return
      const order = dashboards.map((d) => d.id)
      const from = order.indexOf(draggedId)
      const to = order.indexOf(targetId)
      if (from < 0 || to < 0) return
      const r = rowRefs.current.get(targetId)?.getBoundingClientRect()
      if (!r) return
      const mid = (r.top + r.bottom) / 2
      if ((to > from && clientY > mid) || (to < from && clientY < mid)) {
        order.splice(to, 0, order.splice(from, 1)[0])
        onReorder(order)
      }
    },
    [dashboards, onReorder],
  )

  const onHandleDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    drag.current = { id, pointerId: e.pointerId }
    setDragId(id)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // capture is best-effort
    }
  }
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return
    reorderDuringDrag(drag.current.id, e.clientY)
  }
  const endDrag = () => {
    drag.current = null
    setDragId(null)
  }

  // Keyboard reorder (a11y parity with the grip drag).
  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const order = dashboards.map((d) => d.id)
      const i = order.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= order.length) return
      ;[order[i], order[j]] = [order[j], order[i]]
      onReorder(order)
    },
    [dashboards, onReorder],
  )

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        role="menu"
        aria-label="Dashboards"
        aria-hidden={!open}
        className={cn(
          'border-border/60 bg-background/95 fixed left-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl',
          'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        )}
        style={{ bottom: 'calc(var(--chat-safe-padding, 0px) + 4.75rem)' }}
      >
        <p className="text-muted-foreground px-2.5 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide">
          Dashboards
        </p>
        {dashboards.map((d) => {
          const on = activeId === d.id
          return (
            <div
              key={d.id}
              ref={(el) => {
                if (el) rowRefs.current.set(d.id, el)
                else rowRefs.current.delete(d.id)
              }}
              className={cn(
                'flex items-center gap-1 rounded-xl pr-1 transition-colors',
                on && 'bg-[var(--chart-1)]/10',
                dragId === d.id && 'opacity-60',
              )}
            >
              <button
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={() => onJump(d.id)}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm',
                  on
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  FOCUS_RING,
                )}
              >
                <span
                  className="w-[1.15rem] shrink-0 text-center text-base leading-none"
                  aria-hidden="true"
                >
                  {emojiFor(d.id, d.icon)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {d.name}
                </span>
              </button>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label={`Reorder ${d.name}. Use arrow up and down keys.`}
                onPointerDown={(e) => onHandleDown(e, d.id)}
                onPointerMove={onHandleMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    move(d.id, -1)
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    move(d.id, 1)
                  }
                }}
                className={cn(
                  'text-muted-foreground/50 hover:text-foreground flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg active:cursor-grabbing',
                  FOCUS_RING,
                )}
              >
                <GripVertical className="size-4" />
              </button>
            </div>
          )
        })}
        <button
          type="button"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={onAdd}
          className={cn(
            'text-muted-foreground hover:text-foreground border-border/60 mt-1 flex w-full items-center justify-center gap-2 border-t px-2.5 py-2.5 text-[13px] font-medium',
            FOCUS_RING,
          )}
        >
          <Plus className="size-4" />
          Add a dashboard
        </button>
      </div>
    </>
  )
}
