import { Avatar, AvatarFallback, AvatarImage, cn } from '@moldable-ai/ui'
import { categoryColor } from '../lib/colors'

/** Deterministic name → chart-hue index so a merchant is always one color. */
function hashHue(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return categoryColor(h % 5)
}

function monogram(name: string): string {
  const cleaned = name.trim().replace(/^the\s+/i, '')
  const first = cleaned.match(/[A-Za-z0-9]/)
  return (first?.[0] ?? '•').toUpperCase()
}

interface MerchantChipProps {
  name: string
  /** Brand logo URL; falls back to a monogram if missing/broken. */
  logoUrl?: string
  /** Explicit brand color; otherwise a deterministic hue from the name. */
  color?: string
  /**
   * Category emoji to show instead of the monogram (falls back to the monogram
   * when omitted).
   */
  emoji?: string
  /**
   * Use a neutral muted background instead of the per-merchant hue. Preferred in
   * dense lists (e.g. the transactions feed) where per-row colors add noise.
   */
  muted?: boolean
  size?: number
  className?: string
}

/**
 * A circular merchant/app identity chip built on the ui `Avatar`. Shows the
 * brand logo when available, else a category emoji (when given) or a monogram.
 * Background is a deterministic per-merchant hue, or a neutral muted fill when
 * `muted` is set.
 */
export function MerchantChip({
  name,
  logoUrl,
  color,
  emoji,
  muted = false,
  size = 36,
  className,
}: MerchantChipProps) {
  const hue = color ?? hashHue(name)

  return (
    <Avatar
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {logoUrl ? (
        <AvatarImage src={logoUrl} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback
        // When muted, fall through to AvatarFallback's default `bg-muted
        // text-muted-foreground`; otherwise tint by the merchant hue.
        className="font-semibold"
        style={{
          ...(muted
            ? {}
            : {
                backgroundColor: `color-mix(in oklch, ${hue} 18%, transparent)`,
                color: hue,
              }),
          fontSize: Math.round(size * (emoji ? 0.52 : 0.42)),
          lineHeight: 1,
        }}
      >
        {emoji || monogram(name)}
      </AvatarFallback>
    </Avatar>
  )
}
