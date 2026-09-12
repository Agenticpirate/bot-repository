import { Check, LogOut, Settings2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToolbarIconButton,
  cn,
} from '@moldable-ai/ui'
import type { BookmarkFolderStatus } from '../../shared/bookmarks'

interface CategorySettingsProps {
  folders: BookmarkFolderStatus[]
  saving: boolean
  onChange: (selectedFolderIds: string[]) => void
  onDisconnect: () => void
  disconnecting: boolean
}

export function CategorySettings({
  folders,
  saving,
  onChange,
  onDisconnect,
  disconnecting,
}: CategorySettingsProps) {
  const toggle = (folderId: string) => {
    const selected = folders
      .filter((folder) =>
        folder.id === folderId ? !folder.selected : folder.selected,
      )
      .map((folder) => folder.id)
    onChange(selected)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarIconButton label="Category settings">
          <Settings2 />
        </ToolbarIconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <p className="text-xs font-medium">Synced categories</p>
          <p className="text-muted-foreground text-[11px]">All always syncs</p>
        </div>
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          aria-label="Categories to sync"
        >
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={cn(
                'flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-colors',
                folder.selected
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={folder.selected}
              disabled={saving}
              onClick={() => toggle(folder.id)}
            >
              {folder.selected ? <Check className="size-3" /> : null}
              <span>{folder.name}</span>
            </button>
          ))}
          {!folders.length ? (
            <p className="text-muted-foreground py-1 text-[12px]">
              Categories appear after the first sync.
            </p>
          ) : null}
        </div>
        <div className="border-border mt-3 border-t pt-2">
          <button
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-[12px] transition-colors"
            disabled={disconnecting}
            onClick={onDisconnect}
          >
            <LogOut className="size-3.5" />
            Disconnect X account
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
