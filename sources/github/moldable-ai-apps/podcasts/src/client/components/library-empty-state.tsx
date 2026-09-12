import { AudioLines } from 'lucide-react'
import { Button } from '@moldable-ai/ui'

export function LibraryEmptyState({
  kind,
  onClearSearch,
}: {
  kind: 'search' | 'archived' | 'library'
  onClearSearch?: () => void
}) {
  const title =
    kind === 'search'
      ? 'No matching episodes'
      : kind === 'archived'
        ? 'Nothing archived yet'
        : 'Your library is clear'
  const description =
    kind === 'search'
      ? 'Try a different topic or title.'
      : kind === 'archived'
        ? 'Episodes you archive will be kept here.'
        : 'Create a podcast or restore one from Archived.'
  return (
    <div className="library-empty-state" role="status">
      <div className="ghost-episode-list" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="ghost-episode-row" key={index}>
            <div className="ghost-episode-cover">
              <AudioLines className="size-5" />
            </div>
            <div className="ghost-episode-copy">
              <span />
              <span />
            </div>
            <span className="ghost-episode-duration" />
          </div>
        ))}
      </div>
      <div className="library-empty-copy">
        <h3>{title}</h3>
        <p>{description}</p>
        {kind === 'search' && onClearSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={onClearSearch}
          >
            Clear search
          </Button>
        )}
      </div>
    </div>
  )
}
