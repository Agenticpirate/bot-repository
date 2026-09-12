import { Building2, ChevronUp, Inbox, Settings } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@moldable-ai/ui'

export type Tab = 'dashboards' | 'transactions' | 'accounts' | 'settings'

type TabConfig = {
  id: Tab
  label: string
  icon: ComponentType<{ className?: string }> | null
}

const TABS: TabConfig[] = [
  { id: 'dashboards', label: 'Dashboards', icon: null },
  { id: 'transactions', label: 'Activity', icon: Inbox },
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/**
 * Floating bottom navigation for the product's top-level sections.
 *
 * A centered, frosted pill that hovers above the content (and the chat safe
 * area). Inactive tabs are icon-only; the active tab expands to reveal its
 * label on an orange accent fill. Motion reuses the house CSS system
 * (`uk-rise` + `cubic-bezier(0.22, 1, 0.36, 1)`), so it stays reduced-motion
 * safe and survives prod builds (no framer-motion).
 *
 * The Dashboards tab doubles as the dashboards "table of contents" control:
 * while you're on Dashboards its label tracks the section you're scrolled to
 * (`dashboardLabel`), and tapping it again toggles the {@link DashboardTray}
 * (`onDashboardsActivate`) instead of switching tabs. Accounts carries an
 * ambient sync dot so the old top-bar sync pill can go away.
 */
export function TabBar({
  active,
  onChange,
  badges,
  dashboardLabel,
  dashboardIcon,
  dashboardTrayOpen = false,
  onDashboardsActivate,
  syncing = false,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
  /** When on Dashboards, the scroll-spied section name shown in the pill. */
  dashboardLabel?: string
  /** When on Dashboards, the scroll-spied section emoji shown in the pill. */
  dashboardIcon?: string
  /** Whether the dashboards tray is open (drives the chevron + aria-expanded). */
  dashboardTrayOpen?: boolean
  /** Tapping Dashboards while already active toggles the tray, not the tab. */
  onDashboardsActivate?: () => void
  /** Shows an ambient sync dot on the Accounts tab. */
  syncing?: boolean
}) {
  return (
    <nav
      aria-label="Primary"
      className="money-tab-bar pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(var(--chat-safe-padding, 0px) + 1rem)' }}
    >
      <div className="uk-rise border-border/40 bg-background/70 pointer-events-auto flex items-center gap-1 rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl">
        {TABS.map((t) => {
          const on = active === t.id
          const badge = badges?.[t.id] ?? 0
          const isDash = t.id === 'dashboards'
          const Icon = t.icon
          const labelText = isDash && on ? (dashboardLabel ?? t.label) : t.label
          const showSync = t.id === 'accounts' && syncing
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (isDash && on) onDashboardsActivate?.()
                else onChange(t.id)
              }}
              aria-current={on ? 'page' : undefined}
              aria-haspopup={isDash ? 'menu' : undefined}
              aria-expanded={isDash && on ? dashboardTrayOpen : undefined}
              aria-label={
                badge > 0
                  ? `${t.label}, ${badge} need review`
                  : isDash && on
                    ? `${labelText}. ${dashboardTrayOpen ? 'Close' : 'Open'} dashboards menu`
                    : showSync
                      ? `${t.label}, syncing`
                      : t.label
              }
              className={cn(
                'relative flex cursor-pointer items-center rounded-xl px-2.5 py-2 text-[13px] font-medium transition-[color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                on
                  ? 'bg-background text-foreground ring-border/60 shadow-sm ring-1'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
              )}
            >
              <span className="relative flex shrink-0">
                {isDash ? (
                  <span
                    aria-hidden="true"
                    className="grid size-5 place-items-center text-[19px] leading-none"
                  >
                    {dashboardIcon}
                  </span>
                ) : Icon ? (
                  <Icon className="size-5" />
                ) : null}
                {badge > 0 ? (
                  <span
                    aria-hidden="true"
                    className="bg-destructive ring-background absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white ring-2"
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
                {showSync ? (
                  <span
                    aria-hidden="true"
                    className="bg-foreground ring-background absolute -right-1 -top-0.5 size-2 animate-pulse rounded-full ring-2"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  'flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                  on
                    ? 'ml-1.5 max-w-[8.5rem] opacity-100'
                    : 'ml-0 max-w-0 opacity-0',
                )}
              >
                <span className="truncate">{labelText}</span>
                {isDash && on ? (
                  <ChevronUp
                    aria-hidden="true"
                    className={cn(
                      'ml-1 size-3.5 shrink-0 transition-transform duration-300 motion-reduce:transition-none',
                      dashboardTrayOpen && 'rotate-180',
                    )}
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
