/**
 * Shared interaction styles. Hand-rolled `<button>`s across the product re-rolled
 * focus/hover treatments inconsistently (some had no focus ring at all); these
 * constants are the single source so every control reads the same and keyboard
 * focus is always visible.
 */

/** Visible keyboard-focus ring for any interactive control. Surface-agnostic. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * The 24px ghost icon-button used in card headers and list rows (inspect
 * formula, drilldown, range control). Eases its hover/focus like the rest of the
 * surface and carries the standard focus ring.
 */
export const ICON_BTN =
  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/70 ' +
  'transition-colors hover:bg-muted hover:text-foreground ' +
  `${FOCUS_RING} focus-visible:ring-offset-1 focus-visible:ring-offset-card`
