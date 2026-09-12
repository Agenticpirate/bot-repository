/**
 * Adapts the rich client-local demo persona (the crafted FIRE-leaning "$207k net
 * worth, 22% savings rate" story in ui-kit/data-access/demo) into the product's
 * `ResolvedDashboard` shape, so the exact same Dashboards home + detail UI can
 * render a gorgeous, instant, non-mutating demo preview during onboarding —
 * without toggling global backend data-mode or hitting the network.
 */
import { DEMO_DASHBOARDS } from '../../ui-kit/data-access/demo'
import type { ResolvedDashboard } from './hooks'

export const DEMO_RESOLVED_DASHBOARDS: ResolvedDashboard[] =
  DEMO_DASHBOARDS.map((d) => ({
    id: d.id,
    name: d.name,
    cardIds: d.cards.map((c) => c.card.id),
    cards: d.cards.map((c) => c.card),
  }))

export const DEMO_DASHBOARD_BY_ID = Object.fromEntries(
  DEMO_RESOLVED_DASHBOARDS.map((d) => [d.id, d]),
) as Record<string, ResolvedDashboard>
