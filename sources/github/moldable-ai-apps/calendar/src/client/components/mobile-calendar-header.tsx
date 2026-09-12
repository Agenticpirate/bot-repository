import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MobileCalendarViewMode } from './mobile-calendar-view'
import { format } from 'date-fns'

interface MobileCalendarHeaderProps {
  month: Date
  view: MobileCalendarViewMode
  expanded: boolean
  onToggleExpanded: () => void
  onPrevious: () => void
  onNext: () => void
}

export function MobileCalendarHeader({
  month,
  view,
  expanded,
  onToggleExpanded,
  onPrevious,
  onNext,
}: MobileCalendarHeaderProps) {
  return (
    <div className="calendar-mobile-header">
      <h1 className="calendar-mobile-heading">
        <button
          type="button"
          className="calendar-mobile-month-toggle"
          onClick={onToggleExpanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${format(month, 'MMMM yyyy')}`}
          aria-expanded={expanded}
        >
          <span className="calendar-mobile-month-title">
            {format(month, 'MMMM')}
            <ChevronDown aria-hidden className={expanded ? 'rotate-180' : ''} />
          </span>
          <span className="calendar-mobile-year">{format(month, 'yyyy')}</span>
        </button>
      </h1>
      <nav
        className="calendar-mobile-navigation"
        aria-label="Calendar navigation"
      >
        <button
          type="button"
          onClick={onPrevious}
          aria-label={`Previous ${view}`}
        >
          <ChevronLeft aria-hidden />
        </button>
        <button type="button" onClick={onNext} aria-label={`Next ${view}`}>
          <ChevronRight aria-hidden />
        </button>
      </nav>
    </div>
  )
}
