import { PERSONA_BY_ID } from '../personas'

/** Generic fallback when a dashboard has no emoji and isn't a known persona. */
export const DEFAULT_DASHBOARD_EMOJI = '📊'

/**
 * The emoji for a dashboard. Prefers the dashboard's own (user-chosen, or
 * persona-seeded) `icon`, falls back to the persona default for the id, then a
 * generic dashboard glyph — so older dashboards saved before icons existed and
 * agent-created ones still render something sensible.
 */
export function emojiFor(id: string, icon?: string | null): string {
  return icon?.trim() || PERSONA_BY_ID[id]?.emoji || DEFAULT_DASHBOARD_EMOJI
}
