import { CalendarRange, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@moldable-ai/ui'
import { type CardPeriod, RANGE_PERIODS } from '../../ui-kit/cards/cardScope'

/**
 * The per-card range control: a compact pill in the card header that both *shows*
 * the card's current window ("6M") and lets the user re-scope it. Selecting a
 * period re-evaluates the card server-side (see `useCardRange`). It replaces the
 * static scope badge on rangeable cards — the pill is the label.
 */
export function CardRangeControl({
  period,
  onChange,
  loading,
}: {
  period?: CardPeriod
  onChange: (period: CardPeriod) => void
  loading?: boolean
}) {
  const current = RANGE_PERIODS.find((p) => p.id === period)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Time range: ${current?.label ?? 'default'}. Change.`}
          className="text-muted-foreground/80 hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-card inline-flex h-5 items-center gap-0.5 rounded-md px-1.5 text-[10px] font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CalendarRange className="size-3" />
          )}
          <span>{current?.short ?? '…'}</span>
          <ChevronDown className="size-2.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        <DropdownMenuRadioGroup
          value={period}
          onValueChange={(v) => onChange(v as CardPeriod)}
        >
          {RANGE_PERIODS.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id} className="text-xs">
              {p.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
